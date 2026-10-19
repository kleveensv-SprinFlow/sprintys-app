#!/usr/bin/env python3
"""
ETL de la base nutritionnelle Sprintys (Master_Nutrition_DB.xlsx).

Sources : Ciqual 2020 (ANSES, Licence Ouverte Etalab) + USDA FoodData Central (domaine public) pour les
aliments de nutrition sportive absents de Ciqual.

Usage :  python build_master_db.py            (telecharge dans ./cache, ecrit ./out/)
Mention obligatoire dans l'app : « Source : Table de composition nutritionnelle des aliments Ciqual, ANSES »
et « USDA FoodData Central » pour les lignes source = USDA.

Principes :
- aucune valeur inventee. Case Ciqual sans donnee (« - ») = 0.0 (consigne) mais comptee dans micros_manquants ;
  « traces » = 0.0 ; « < X » = X / 2 ;
- l'energie absente de Ciqual (plus d'un aliment sur quatre en 2020) est recalculee avec les facteurs du
  reglement UE 1169/2011 et marquee kcal_source = « calculee » ; la formule est controlee sur les aliments qui
  ont les deux valeurs (voir feuille Rapport) ;
- tout ce qui est estime (portion, facteur de cuisson) porte une colonne *_source ;
- les fiches sans aucune valeur nutritive (hors eaux et boissons) sont exclues et listees (feuille Exclus).
"""
from __future__ import annotations

import io
import re
import sys
import unicodedata
import zipfile
from pathlib import Path

import pandas as pd
import requests

HERE = Path(__file__).parent
CACHE = HERE / "cache"
OUT = HERE / "out"

CIQUAL_URL = "https://ciqual.anses.fr/cms/sites/default/files/inline-files/Table%20Ciqual%202020_FR_2020%2007%2007.xls"
USDA_URLS = {
    "foundation": "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2024-04-18.zip",
    "sr_legacy": "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip",
}


# --------------------------------------------------------------------------------------------------------------
# Utilitaires
# --------------------------------------------------------------------------------------------------------------
def norm(text) -> str:
    """minuscules, sans accents, apostrophes simples, espaces compactes."""
    s = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode()
    s = s.lower().replace("’", "'")
    s = re.sub(r"[^a-z0-9'%/ .,+:()_-]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def clean_value(val) -> tuple[float, bool]:
    """-> (valeur float stricte, True si la case n'avait aucune donnee). Regle : traces/'-' = 0.0 ; '< X' = X/2."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0, True
    if isinstance(val, (int, float)):
        return float(val), False
    s = str(val).strip().replace(",", ".").replace("\xa0", " ")
    if s in ("", "-", "–", "nd", "ND"):
        return 0.0, True
    if s.lower().startswith("trace"):
        return 0.0, False
    m = re.match(r"^<\s*([0-9.]+)", s)
    if m:
        return round(float(m.group(1)) / 2, 4), False
    m = re.match(r"^\[?\s*([0-9.]+)\s*[-–]\s*([0-9.]+)\s*\]?$", s)  # intervalle -> milieu
    if m:
        return round((float(m.group(1)) + float(m.group(2))) / 2, 4), False
    try:
        return float(s), False
    except ValueError:
        return 0.0, True


def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 100_000:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  telechargement {url}")
    r = requests.get(url, timeout=300)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


# --------------------------------------------------------------------------------------------------------------
# Colonnes cibles
# --------------------------------------------------------------------------------------------------------------
MACROS = ["kcal", "proteines_g", "glucides_g", "sucres_g", "fibres_g", "lipides_g", "ag_satures_g",
          "ag_monoinsatures_g", "ag_polyinsatures_g", "omega3_g", "omega6_g"]
MICROS = ["sodium_mg", "sel_g", "potassium_mg", "magnesium_mg", "calcium_mg", "phosphore_mg", "fer_mg", "zinc_mg",
          "cuivre_mg", "manganese_mg", "selenium_ug", "iode_ug", "vitamine_a_ug", "vitamine_b1_mg",
          "vitamine_b2_mg", "vitamine_b3_mg", "vitamine_b5_mg", "vitamine_b6_mg", "vitamine_b9_ug",
          "vitamine_b12_ug", "vitamine_c_mg", "vitamine_d_ug", "vitamine_e_mg", "vitamine_k1_ug"]
NUTRIMENTS = MACROS + MICROS + ["eau_g"]

CIQUAL_MAP = {  # colonne cible -> expression sur le nom de colonne normalise
    "kcal": r"^energie, reglement.*kcal",
    "kcal_jones": r"^energie, n x facteur jones, avec fibres.*kcal",
    "proteines_g": r"^proteines, n x 6.25",
    "glucides_g": r"^glucides",
    "sucres_g": r"^sucres",
    "fibres_g": r"^fibres alimentaires",
    "lipides_g": r"^lipides",
    "ag_satures_g": r"^ag satures",
    "ag_monoinsatures_g": r"^ag monoinsatures",
    "ag_polyinsatures_g": r"^ag polyinsatures",
    "eau_g": r"^eau",
    "_polyols": r"^polyols totaux",
    "_alcool": r"^alcool",
    "_acides": r"^acides organiques",
    "_ala": r"^ag 18:3.*n-3",
    "_epa": r"^ag 20:5.*n-3",
    "_dha": r"^ag 22:6.*n-3",
    "_la": r"^ag 18:2.*n-6",
    "_aa": r"^ag 20:4.*n-6",
    "sel_g": r"^sel chlorure",
    "sodium_mg": r"^sodium",
    "potassium_mg": r"^potassium",
    "magnesium_mg": r"^magnesium",
    "calcium_mg": r"^calcium",
    "phosphore_mg": r"^phosphore",
    "fer_mg": r"^fer ",
    "zinc_mg": r"^zinc",
    "cuivre_mg": r"^cuivre",
    "manganese_mg": r"^manganese",
    "selenium_ug": r"^selenium",
    "iode_ug": r"^iode",
    "_retinol": r"^retinol",
    "_betacarotene": r"^beta-carotene",
    "vitamine_b1_mg": r"^vitamine b1",
    "vitamine_b2_mg": r"^vitamine b2",
    "vitamine_b3_mg": r"^vitamine b3",
    "vitamine_b5_mg": r"^vitamine b5",
    "vitamine_b6_mg": r"^vitamine b6",
    "vitamine_b9_ug": r"^vitamine b9",
    "vitamine_b12_ug": r"^vitamine b12",
    "vitamine_c_mg": r"^vitamine c",
    "vitamine_d_ug": r"^vitamine d",
    "vitamine_e_mg": r"^vitamine e",
    "vitamine_k1_ug": r"^vitamine k1",
}


def load_ciqual() -> pd.DataFrame:
    path = download(CIQUAL_URL, CACHE / "ciqual_2020.xls")
    raw = pd.read_excel(path, sheet_name=0, dtype=object)
    cols = {c: norm(c) for c in raw.columns}
    by_norm = {v: k for k, v in cols.items()}
    pick: dict[str, str] = {}
    for target, pattern in CIQUAL_MAP.items():
        found = [c for c, nm in cols.items() if re.search(pattern, nm)]
        if not found:
            print(f"  ! colonne Ciqual introuvable pour {target}")
            continue
        pick[target] = found[0]
    c_code, c_nom = by_norm["alim_code"], by_norm["alim_nom_fr"]
    c_grp, c_ssgrp = by_norm["alim_grp_nom_fr"], by_norm["alim_ssgrp_nom_fr"]

    rows = []
    for _, r in raw.iterrows():
        vals: dict[str, float] = {}
        absent_cols: set[str] = set()
        missing_micro = 0
        for target, col in pick.items():
            v, absent = clean_value(r[col])
            vals[target] = v
            if absent:
                absent_cols.add(target)
                if target in MICROS or target in ("_retinol", "_betacarotene"):
                    missing_micro += 1
        kcal_ciqual = None if ("kcal" in absent_cols or vals.get("kcal", 0) == 0) else vals["kcal"]
        if kcal_ciqual is None and "kcal_jones" not in absent_cols and vals.get("kcal_jones", 0) > 0:
            kcal_ciqual = vals["kcal_jones"]
        # Energie calculee (reglement UE 1169/2011) : prot 4, gluc 4, lip 9, fibres 2, polyols 2,4, alcool 7, acides 3
        kcal_calc = round(
            4 * vals.get("proteines_g", 0) + 4 * vals.get("glucides_g", 0) + 9 * vals.get("lipides_g", 0)
            + 2 * vals.get("fibres_g", 0) + 2.4 * vals.get("_polyols", 0) + 7 * vals.get("_alcool", 0)
            + 3 * vals.get("_acides", 0), 1)
        vals["kcal"] = kcal_ciqual if kcal_ciqual is not None else kcal_calc
        vals["omega3_g"] = round(vals.get("_ala", 0) + vals.get("_epa", 0) + vals.get("_dha", 0), 4)
        vals["omega6_g"] = round(vals.get("_la", 0) + vals.get("_aa", 0), 4)
        vals["vitamine_a_ug"] = round(vals.get("_retinol", 0) + vals.get("_betacarotene", 0) / 12, 3)  # RAE
        rows.append({
            "source": "Ciqual",
            "source_id": str(r[c_code]).strip(),
            "nom_origine": str(r[c_nom]).strip(),
            "groupe": str(r[c_grp]).strip(),
            "sous_groupe": str(r[c_ssgrp]).strip(),
            "micros_manquants": missing_micro,
            "kcal_source": "ciqual" if kcal_ciqual is not None else "calculee (UE 1169/2011)",
            "kcal_calc": kcal_calc,
            **{k: vals.get(k, 0.0) for k in NUTRIMENTS},
        })
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------------------------------------------
# USDA : seulement les aliments de nutrition sportive qui manquent a Ciqual
# --------------------------------------------------------------------------------------------------------------
USDA_NUTRIENT_NBR = {
    "208": "kcal", "203": "proteines_g", "205": "glucides_g", "269": "sucres_g", "291": "fibres_g",
    "204": "lipides_g", "606": "ag_satures_g", "645": "ag_monoinsatures_g", "646": "ag_polyinsatures_g",
    "307": "sodium_mg", "306": "potassium_mg", "304": "magnesium_mg", "301": "calcium_mg", "305": "phosphore_mg",
    "303": "fer_mg", "309": "zinc_mg", "312": "cuivre_mg", "315": "manganese_mg", "317": "selenium_ug",
    "320": "vitamine_a_ug", "404": "vitamine_b1_mg", "405": "vitamine_b2_mg", "406": "vitamine_b3_mg",
    "410": "vitamine_b5_mg", "415": "vitamine_b6_mg", "417": "vitamine_b9_ug", "418": "vitamine_b12_ug",
    "401": "vitamine_c_mg", "328": "vitamine_d_ug", "323": "vitamine_e_mg", "430": "vitamine_k1_ug",
    "255": "eau_g",
}
USDA_OMEGA3 = {"851", "629", "621", "631"}  # ALA, EPA, DHA, DPA
USDA_OMEGA6 = {"675", "620"}  # linoleique, arachidonique

# (regex FR : « deja couvert par Ciqual », regex description USDA, nom affiche, tags, portion)
USDA_WANTED = [
    (r"whey|lactoserum.*poudre|proteine.*poudre", r"^Beverages, Protein powder whey based", "Whey protéine (poudre)",
     "whey proteine poudre isolat lactoserum complement", ("1 scoop", 30)),
    (r"lait.*poudre|caseine", r"^Milk, dry, nonfat, regular", "Lait écrémé en poudre", "lait poudre ecreme caseine", ("1 c. à soupe", 8)),
    (r"flocons d'avoine|^avoine", r"^Cereals, oats, regular and quick, not fortified, dry", "Flocons d'avoine (secs)",
     "avoine porridge flocons oat muesli", ("1 portion", 40)),
    (r"chia", r"^Seeds, chia seeds, dried", "Graines de chia", "chia graines omega", ("1 c. à soupe", 12)),
    (r"quinoa", r"^Quinoa, uncooked", "Quinoa (cru)", "quinoa cereale", ("1 portion crue", 70)),
    (r"beurre de cacahu", r"^Peanut butter, smooth style, with salt", "Beurre de cacahuète", "beurre cacahuete peanut", ("1 c. à soupe", 16)),
    (r"patate douce", r"^Sweet potato, raw, unprepared", "Patate douce (crue)", "patate douce sweet potato", ("1 patate douce", 150)),
]


def load_usda_frames():
    frames = {}
    for key, url in USDA_URLS.items():
        z = zipfile.ZipFile(io.BytesIO(download(url, CACHE / f"usda_{key}.zip").read_bytes()))
        names = {Path(n).name: n for n in z.namelist()}

        def rd(name, **kw):
            return pd.read_csv(z.open(names[name]), dtype=str, **kw)

        frames[key] = {
            "food": rd("food.csv", usecols=["fdc_id", "description"]),
            "nut": rd("food_nutrient.csv", usecols=["fdc_id", "nutrient_id", "amount"]),
            "nutdef": rd("nutrient.csv", usecols=["id", "nutrient_nbr"]),
        }
    return frames


def usda_row(frames, desc_regex: str):
    for key in ("foundation", "sr_legacy"):
        f = frames[key]
        hit = f["food"][f["food"]["description"].str.contains(desc_regex, regex=True, na=False)]
        if hit.empty:
            continue
        fdc = hit.iloc[0]["fdc_id"]
        nutdef = dict(zip(f["nutdef"]["id"], f["nutdef"]["nutrient_nbr"]))
        vals = {k: 0.0 for k in NUTRIMENTS}
        o3 = o6 = 0.0
        for _, nu in f["nut"][f["nut"]["fdc_id"] == fdc].iterrows():
            nbr = str(nutdef.get(nu["nutrient_id"], "")).split(".")[0]
            amount = float(nu["amount"]) if nu["amount"] not in (None, "") else 0.0
            if nbr in USDA_NUTRIENT_NBR:
                vals[USDA_NUTRIENT_NBR[nbr]] = amount
            elif nbr in USDA_OMEGA3:
                o3 += amount
            elif nbr in USDA_OMEGA6:
                o6 += amount
        vals["omega3_g"], vals["omega6_g"] = round(o3, 4), round(o6, 4)
        vals["sel_g"] = round(vals["sodium_mg"] * 2.5 / 1000, 3)  # sel = sodium x 2,5
        return key, fdc, hit.iloc[0]["description"], vals
    return None


# --------------------------------------------------------------------------------------------------------------
# Enrichissement : portions, etat, facteur de cuisson (du plus precis au plus general)
# --------------------------------------------------------------------------------------------------------------
PORTION_RULES: list[tuple[str, str, float]] = [
    (r"blanc \(blanc d'oeuf\)|^blanc d'oeuf", "1 blanc d'œuf", 33),
    (r"jaune \(jaune d'oeuf\)|^jaune d'oeuf", "1 jaune d'œuf", 17),
    (r"^oeuf|omelette", "1 œuf", 50),
    (r"skyr", "1 pot", 140),
    (r"fromage blanc|faisselle", "1 pot", 100),
    (r"^yaourt|^yogourt|lait fermente|^yoghourt", "1 pot", 125),
    (r"whey|proteine.*poudre", "1 scoop", 30),
    (r"poulet.*(blanc|pectoraux|filet)|dinde.*(blanc|filet|escalope)|escalope", "1 filet", 130),
    (r"steak hache|boeuf.*hache|viande hachee", "1 steak haché", 100),
    (r"saumon|cabillaud|merlu|colin|truite|dorade|bar,|lieu", "1 pavé", 130),
    (r"thon", "1 boîte égouttée", 110),
    (r"jambon", "1 tranche", 40),
    (r"^banane", "1 banane", 120),
    (r"clementine|mandarine", "1 clémentine", 70),
    (r"^kiwi", "1 kiwi", 75),
    (r"^pomme,|^pomme$|^poire", "1 fruit", 150),
    (r"^orange,|^orange$|pamplemousse", "1 fruit", 130),
    (r"^abricot", "1 abricot", 45),
    (r"^peche|^nectarine", "1 fruit", 150),
    (r"^avocat", "1/2 avocat", 75),
    (r"^patate douce", "1 patate douce", 150),
    (r"^pomme de terre", "1 pomme de terre", 150),
    (r"^(boeuf|veau|porc|agneau|canard)", "1 portion de viande", 125),
    (r"^biscotte", "1 biscotte", 10),
    (r"^concombre", "1/2 concombre", 150),
    (r"^courgette", "1 courgette", 200),
    (r"^poivron", "1 poivron", 150),
    (r"^mangue", "1/2 mangue", 150),
    (r"^(fraise|framboise|myrtille|cerise)", "1 poignée", 100),
    (r"^citron,", "1 citron", 100),
    (r"^tomate", "1 tomate", 120),
    (r"^carotte", "1 carotte", 80),
    (r"^oignon", "1 oignon", 80),
    (r"^huile", "1 c. à soupe", 10),
    (r"beurre de cacahu|puree d'amande|puree de noisette", "1 c. à soupe", 16),
    (r"^beurre", "1 noix de beurre", 10),
    (r"^miel", "1 c. à café", 7),
    (r"confiture|pate a tartiner|creme de marron", "1 c. à soupe", 20),
    (r"^sucre", "1 c. à café", 5),
    (r"chocolat noir|chocolat au lait", "1 carré", 10),
    (r"^amande|^noisette|^noix|cajou|pistache|cacahuete|arachide", "1 poignée", 30),
    (r"flocons d'avoine|^avoine|muesli|cereales pour petit", "1 portion", 40),
    (r"^pain de mie", "1 tranche", 25),
    (r"baguette", "1/4 de baguette", 60),
    (r"^pain", "1 tranche", 30),
    (r"^lait", "1 verre", 200),
    (r"fromage", "1 portion", 30),
    (r"^(riz|pates|semoule|quinoa|boulgour|lentille|pois chiche|haricots?).*(cuit|bouilli)", "1 portion", 180),
    (r"^(riz|pates|semoule|quinoa|boulgour|lentille|pois chiche)", "1 portion crue", 80),
]
DEFAULT_PORTION = ("1 portion", 100.0)

COOK_RULES: list[tuple[str, float]] = [  # poids cuit = poids cru x facteur (estimations courantes, a valider)
    (r"^riz", 2.8),
    (r"^pates|spaghetti|macaroni|tagliatelle|coquillette", 2.3),
    (r"^semoule|couscous|boulgour|quinoa", 2.5),
    (r"^lentille|^pois chiche|haricot sec|^haricots? (blanc|rouge)|^feve", 2.5),
    (r"^poulet|^dinde|^boeuf|^veau|^porc|^agneau|^canard|^lapin", 0.78),
    (r"^saumon|^cabillaud|^thon|^truite|^merlu|^colin|^sardine|^maquereau|^dorade", 0.85),
]

COOKED_WORDS = r"\b(cuit|roti|bouilli|poele|frit|grille|braise|saute)(e|s|es)?\b|\bvapeur\b|\bau four\b|^oeuf, dur"
NUTS = re.compile(r"amande|noisette|noix|cacahuete|arachide|pistache|cajou|sesame|graine|marron|chataigne")


DRY_STAPLES = re.compile(r"^(lentille|pois chiche|haricot|feve|pois cass|riz|pates|semoule|boulgour|quinoa|mais|ble|avoine)")


def etat_of(nm: str) -> str:
    nm = re.sub(r"(ou |au |de )?lait cru|au lait pasteurise ou cru", " ", nm)  # « lait cru » ne veut pas dire aliment cru
    if re.search(r"\b(cru|crue|crus|crues)\b", nm):
        return "Cru"
    if DRY_STAPLES.search(nm) and re.search(r"\b(sec|seche|seches|secs)\b", nm) and not re.search(r"cuit|bouilli", nm):
        return "Cru"
    if NUTS.search(nm) and not re.search(r"\b(cuit|cuite|bouilli|vapeur)\b", nm):
        return "Prêt à consommer"
    if re.search(COOKED_WORDS, nm):
        return "Cuit"
    return "Prêt à consommer"


# --------------------------------------------------------------------------------------------------------------
# Noms, tags, priorites
# --------------------------------------------------------------------------------------------------------------
SYNONYMS = {
    "poulet": "volaille blanc filet escalope", "dinde": "volaille escalope filet", "boeuf": "viande rouge steak",
    "veau": "viande escalope", "porc": "viande cochon", "jambon": "charcuterie", "saumon": "poisson gras",
    "thon": "poisson", "cabillaud": "poisson blanc", "oeuf": "oeufs omelette", "yaourt": "yogourt laitage",
    "fromage blanc": "laitage", "skyr": "laitage yaourt islandais", "riz": "feculent cereale", "pates": "feculent pasta spaghetti",
    "pomme de terre": "patate feculent", "patate douce": "feculent", "flocons d'avoine": "avoine porridge oat",
    "pain": "baguette tranche", "banane": "fruit", "pomme": "fruit", "huile": "matiere grasse", "beurre": "matiere grasse",
    "lait": "boisson laitage", "amande": "oleagineux fruits secs", "noix": "oleagineux fruits secs",
    "lentille": "legumineuse legumes secs", "pois chiche": "legumineuse legumes secs", "whey": "proteine poudre complement",
}
STOP = {"de", "du", "des", "le", "la", "les", "et", "ou", "au", "aux", "en", "a", "sans", "avec", "d", "l", "non", "aliment", "moyen"}

# Fiches a ne jamais retenir comme « aliment de base » du niveau 1 (transformes, sucres, prepares)
T1_EXCLUDE = re.compile(
    r"puree|(semoule|riz|tapioca|flan) au lait|carbonara|fourre|praline|sirop|compote|\bjus\b|\bconfits?\b|pane\b|panee|cuisine|gratin|"
    r"salade (de|cesar|compos)|brioche|prepar|recette|biscuit|gateau|soupe|farci|nuggets|en poudre|lyophil|condense|"
    r"rayon frais|aromatise|sucre,|viennois|sauce|dessert|beignet|chips|croquette|vinaigre|melba|belle helene|givre|germe|"
    r"au mouton|au poulet|aux legumes|variete locale|au fromage|a la creme|au beurre|saumure|rissol|marque|pour bebe|"
    r"infantile|sandwich|crepe|bolognaise|marinier|marine\b|au poisson|brebis|sur lit|aux fruits|provencale|fait maison")
# Fruits : la version sechee n'est pas le fruit. Pour les legumineuses, cereales, dattes, etc. le « sec » est leur etat de base.
EXCLUDE_BYPASS = {"Jus d'orange", "Jus de pomme", "Café", "Thé"}  # boissons courantes : le filtre « jus / boisson » ne s'applique pas
DRIED = re.compile(r"\bsec\b|\bseche[es]*\b|\bsecs\b|deshydrat")
DRIED_OK = {"Lentilles", "Pois chiches", "Haricots rouges", "Haricots blancs", "Riz blanc", "Riz complet", "Riz basmati", "Pâtes",
            "Pâtes complètes", "Semoule", "Boulgour", "Quinoa", "Flocons d'avoine", "Dattes", "Farine de blé", "Maïs", "Petits pois",
            "Biscottes", "Muesli", "Couscous", "Graines de chia", "Graines de lin", "Graines de tournesol", "Graines de courge"}
PENALTY = re.compile(r"appertis|surgel|fume|prelevee|environ|sans gluten|aux oeufs|preemballe|enrichi|aromatise")  # fiches moins « de base »

# Niveau 1 : (regex sur nom normalise, nom affiche). Par regle et par etat, la fiche la plus simple est retenue.
TIER1: list[tuple[str, str]] = [
    # oeufs
    (r"^oeuf, (entier|poule)|^oeuf, (cru|cuit|dur)|^oeuf de poule", "Œuf"),
    (r"^oeuf, blanc", "Blanc d'œuf"),
    (r"^oeuf, jaune", "Jaune d'œuf"),
    # volailles, viandes
    (r"^poulet, (blanc|pectoraux|filet)", "Blanc de poulet"),
    (r"^poulet, cuisse", "Cuisse de poulet"),
    (r"^dinde, (blanc|filet|escalope)", "Blanc de dinde"),
    (r"^boeuf, steak hache 5%|^boeuf, hache 5%", "Steak haché 5 %"),
    (r"^boeuf, steak hache 15%|^boeuf, hache 15%", "Steak haché 15 %"),
    (r"^boeuf, (rumsteck|bavette|faux-filet|entrecote|rosbif|filet|basses? cotes?|tende de tranche)", "Bœuf (steak)"),
    (r"^veau, (escalope|filet)", "Escalope de veau"),
    (r"^porc, (filet|longe)", "Filet de porc"),
    (r"^agneau, (gigot|cotelette|selle)", "Agneau"),
    (r"^lapin", "Lapin"),
    (r"^jambon (blanc|cuit)|^jambon cuit", "Jambon blanc"),
    (r"^lardons?", "Lardons"),
    # poissons
    (r"^saumon", "Saumon"),
    (r"^thon", "Thon"),
    (r"^cabillaud", "Cabillaud"),
    (r"^merlu", "Merlu"),
    (r"^lieu jaune ou colin|^colin", "Colin"),
    (r"^truite", "Truite"),
    (r"^sardine", "Sardines"),
    (r"^maquereau", "Maquereau"),
    (r"^crevette", "Crevettes"),
    (r"^moule", "Moules"),
    # laitages
    (r"^yaourt.*nature|^yaourt, nature|^yaourt ou specialite laitiere nature|^yaourt, lait fermente ou specialite laitiere, nature", "Yaourt nature"),
    (r"^yaourt grec|^yaourt.*grec", "Yaourt grec"),
    (r"^fromage blanc", "Fromage blanc"),
    (r"^lait (demi-ecreme|ecreme)", "Lait"),
    (r"^lait entier", "Lait entier"),
    (r"^emmental", "Emmental"),
    (r"^mozzarella", "Mozzarella"),
    (r"^parmesan", "Parmesan"),
    (r"^comte", "Comté"),
    (r"^feta", "Feta"),
    (r"^fromage de chevre", "Fromage de chèvre"),
    (r"^creme de lait, 30% mg", "Crème fraîche"),
    (r"^creme de lait, 15 a 20% mg", "Crème fraîche légère"),
    (r"^boisson (vegetale )?(au|a base de) soja|^lait de soja", "Lait de soja"),
    # feculents
    (r"^riz (blanc|long|rond)|^riz, ", "Riz blanc"),
    (r"^riz basmati", "Riz basmati"),
    (r"^riz complet", "Riz complet"),
    (r"^pates.*completes?", "Pâtes complètes"),
    (r"^pates(?!.*(completes?|sans gluten|farcies|fraiches|aux oeufs))", "Pâtes"),
    (r"^semoule", "Semoule"),
    (r"^couscous", "Couscous"),
    (r"^quinoa", "Quinoa"),
    (r"^boulgour", "Boulgour"),
    (r"^pomme de terre", "Pomme de terre"),
    (r"^patate douce", "Patate douce"),
    (r"^flocons d'avoine|^avoine", "Flocons d'avoine"),
    (r"^pain complet", "Pain complet"),
    (r"^pain de mie", "Pain de mie"),
    (r"^pain, (baguette|courant|blanc)|^baguette|^pain courant", "Pain blanc (baguette)"),
    (r"^biscotte", "Biscottes"),
    (r"^muesli", "Muesli"),
    (r"^farine de ble", "Farine de blé"),
    (r"^mais( doux)?,", "Maïs"),
    # legumineuses
    (r"^lentille", "Lentilles"),
    (r"^pois chiche", "Pois chiches"),
    (r"^haricot rouge", "Haricots rouges"),
    (r"^haricot blanc", "Haricots blancs"),
    (r"^petits? pois|^pois vert|^pois,", "Petits pois"),
    (r"^tofu", "Tofu"),
    # legumes
    (r"^tomate", "Tomate"), (r"^carotte", "Carotte"), (r"^courgette", "Courgette"), (r"^aubergine", "Aubergine"),
    (r"^poivron", "Poivron"), (r"^concombre", "Concombre"), (r"^salade verte|^laitue,", "Salade verte"),
    (r"^brocoli", "Brocoli"), (r"^chou-fleur", "Chou-fleur"), (r"^epinard", "Épinards"),
    (r"^haricot vert", "Haricots verts"), (r"^champignon", "Champignons"), (r"^oignon,", "Oignon"),
    (r"^poireau,", "Poireau"), (r"^betterave", "Betterave"), (r"^radis", "Radis"), (r"^potiron,|^courge,", "Courge"),
    (r"^asperge", "Asperges"), (r"^avocat", "Avocat"), (r"^ail,", "Ail"),
    # fruits
    (r"^banane(?!.*plantain)", "Banane"), (r"^pomme,|^pomme$", "Pomme"), (r"^poire(,|$)", "Poire"), (r"^orange,", "Orange"),
    (r"^clementine", "Clémentine"), (r"^citron,", "Citron"), (r"^pamplemousse", "Pamplemousse"),
    (r"^fraise", "Fraises"), (r"^framboise", "Framboises"), (r"^myrtille", "Myrtilles"), (r"^raisin", "Raisin"),
    (r"^kiwi", "Kiwi"), (r"^ananas", "Ananas"), (r"^mangue", "Mangue"), (r"^peche,", "Pêche"),
    (r"^abricot", "Abricot"), (r"^cerise", "Cerises"), (r"^melon", "Melon"), (r"^pasteque", "Pastèque"),
    (r"^prune", "Prune"), (r"^datte", "Dattes"), (r"^figue", "Figue"),
    # oleagineux et graines
    (r"^amande", "Amandes"), (r"^noix,|^noix de grenoble|^noix$", "Noix"), (r"^noisette", "Noisettes"),
    (r"^noix de cajou", "Noix de cajou"), (r"^pistache", "Pistaches"), (r"^cacahuete|^arachide", "Cacahuètes"),
    (r"^graine de chia|^chia", "Graines de chia"), (r"^graine de lin|^lin,", "Graines de lin"),
    (r"^graine de tournesol|^tournesol, graine", "Graines de tournesol"), (r"^courge, graine|^graine de courge", "Graines de courge"),
    (r"^beurre de cacahu", "Beurre de cacahuète"),
    # matieres grasses, sucres
    (r"^huile d'olive", "Huile d'olive"), (r"^huile de colza", "Huile de colza"), (r"^huile de tournesol", "Huile de tournesol"),
    (r"^huile ou graisse de coco|^huile de coco", "Huile de coco"), (r"^beurre ", "Beurre"), (r"^matiere grasse vegetale \(type margarine\)|^margarine", "Margarine"),
    (r"^miel", "Miel"), (r"^sucre (blanc|en poudre|roux)|^sucre, ", "Sucre"), (r"^confiture", "Confiture"),
    (r"^chocolat noir", "Chocolat noir"), (r"^chocolat au lait, tablette|^chocolat au lait$", "Chocolat au lait"), (r"^pate a tartiner", "Pâte à tartiner"),
    (r"^sirop d'erable", "Sirop d'érable"),
    (r"^jus d'orange", "Jus d'orange"), (r"^jus de pomme", "Jus de pomme"), (r"^cafe", "Café"), (r"^the, |^the infusion", "Thé"),
]

T2_GROUPS = ("fruits, legumes", "produits cerealiers", "viandes", "produits laitiers", "matieres grasses", "produits sucres")
T3_GROUPS = ("entrees et plats", "aliments infantiles", "aides culinaires", "eaux et boissons", "glaces", "autres")
TIER3_NAME = re.compile(r"\b(abats?|foie|rognon|cervelle|langue|tripes?|boudin|andouille|pate de|rillettes|preparation|plat|recette|"
                        r"pizza|quiche|burger|nuggets?|surgel|infantile|bebe|lyophilis|aliment moyen|base pour|extrait|marque|"
                        r"preemballe|rayon frais|saumure|aromatise|enrichi)\b")

NOISE = re.compile(r"(preleve[e]? a [a-z' ]+|non sale[e]?|appertise[e]?|egoutte[e]?|aliment moyen|sans noyau|en conserve)", re.I)


def nice_name(nom: str, etat: str) -> str:
    parts = [p.strip() for p in str(nom).split(",") if p.strip()]
    if not parts:
        return nom
    mods = []
    for p in parts[1:]:
        pn = norm(p)
        if pn in ("cru", "crue", "cuit", "cuite", "cuits", "cuites") or NOISE.search(pn):
            continue
        mods.append(p[0].lower() + p[1:])
    suffix = {"Cru": "cru", "Cuit": "cuit"}.get(etat)
    txt = parts[0][0].upper() + parts[0][1:]
    inside = ", ".join(x for x in [", ".join(mods[:2]), suffix] if x)
    return f"{txt} ({inside})" if inside else txt


def make_tags(display: str, nom_origine: str, sous: str) -> str:
    blob = norm(display) + " " + norm(nom_origine)
    words = [w for w in re.split(r"[ ,()/'.:+-]+", blob) if len(w) > 2 and w not in STOP and not w.isdigit()]
    tags = list(dict.fromkeys(words))
    for key, syn in SYNONYMS.items():
        if key in blob:
            tags.extend(s for s in syn.split() if s not in tags)
    tags.extend(w for w in re.split(r"[ ,()/'-]+", norm(sous)) if len(w) > 3 and w not in STOP and w not in tags)
    return " ".join(dict.fromkeys(tags))


def main() -> int:
    OUT.mkdir(exist_ok=True)
    print("1/5 Ciqual")
    df = load_ciqual()
    n0 = len(df)
    empty = (df[["kcal", "proteines_g", "glucides_g", "lipides_g"]].sum(axis=1) == 0)
    drinks = df["groupe"].map(norm).str.contains("eaux et boissons")
    excluded = df[empty & ~drinks].copy()
    df = df[~(empty & ~drinks)].reset_index(drop=True)

    # Controle de la formule d'energie sur les aliments qui ont les deux valeurs
    both = df[(df.kcal_source == "ciqual") & (df.kcal > 20)]
    rel = ((both.kcal_calc - both.kcal).abs() / both.kcal)
    calc_n = int((df.kcal_source != "ciqual").sum())
    print(f"  {n0} fiches, {len(excluded)} exclues ; energie recalculee pour {calc_n} ; ecart median formule/Ciqual = {rel.median():.1%}")

    print("2/5 USDA (complements de nutrition sportive)")
    frames = load_usda_frames()
    ciq_norm = df["nom_origine"].map(norm)
    added, not_found, already = [], [], []
    for covered_re, usda_re, disp, tags, portion in USDA_WANTED:
        if ciq_norm.str.contains(covered_re, regex=True).any():
            already.append(disp)
            continue
        hit = usda_row(frames, usda_re)
        if not hit:
            not_found.append(disp)
            continue
        key, fdc, desc, vals = hit
        added.append({"source": f"USDA {key}", "source_id": fdc, "nom_origine": desc, "groupe": "usda complement",
                      "sous_groupe": "nutrition sportive", "micros_manquants": 0, "kcal_source": "usda",
                      "kcal_calc": vals["kcal"], **vals, "_display": disp, "_portion": portion})
    if added:
        df = pd.concat([df, pd.DataFrame(added)], ignore_index=True)
    print(f"  ajoutes : {[a['_display'] for a in added]} | deja dans Ciqual : {already} | introuvables : {not_found}")

    print("3/5 Enrichissement")
    nm = df["nom_origine"].map(norm)
    df["etat"] = nm.map(etat_of)
    labels, grams, psrc = [], [], []
    for i, name in enumerate(nm):
        forced = df.at[i, "_portion"] if "_portion" in df.columns else None
        if isinstance(forced, tuple):
            labels.append(forced[0]); grams.append(float(forced[1])); psrc.append("regle (estimation)")
            continue
        for pat, label, g in PORTION_RULES:
            if re.search(pat, name):
                labels.append(label); grams.append(float(g)); psrc.append("regle (estimation)")
                break
        else:
            labels.append(DEFAULT_PORTION[0]); grams.append(DEFAULT_PORTION[1]); psrc.append("defaut")
    df["unite_label"], df["poids_moyen_g"], df["portion_source"] = labels, grams, psrc
    cook = []
    for name, etat in zip(nm, df["etat"]):
        f = None
        if etat == "Cru":
            for pat, fac in COOK_RULES:
                if re.search(pat, name):
                    f = fac
                    break
        cook.append(f)
    df["facteur_cuisson"] = cook
    df["facteur_source"] = df["facteur_cuisson"].map(lambda x: "regle generale (estimation)" if pd.notna(x) else "")

    print("4/5 Noms, tags, priorites")
    df["display_name"] = [nice_name(a, b) for a, b in zip(df["nom_origine"], df["etat"])]
    if "_display" in df.columns:
        df["display_name"] = [d if pd.isna(o) else o for d, o in zip(df["display_name"], df["_display"])]
    # Fiches presque vides (ex. 4,8 kcal, aucun micronutriment) : jamais « aliment de base », rangees au niveau 3
    poor = ((df["proteines_g"] + df["glucides_g"] + df["lipides_g"] + df["fibres_g"] < 2.5) & (df["kcal"] < 12)
            & ~df["groupe"].map(norm).str.contains("boissons"))
    df["donnees_pauvres"] = poor
    df["search_priority"] = 0
    df["popularite"] = 999
    kept: dict = {}
    unmatched = []
    for rank, (pat, base) in enumerate(TIER1):
        m = nm.str.contains(pat, regex=True) & (df["source"] == "Ciqual") & ~df["donnees_pauvres"]
        if base not in EXCLUDE_BYPASS:
            m = m & ~nm.str.contains(T1_EXCLUDE)
        if base not in DRIED_OK:
            m = m & ~nm.str.contains(DRIED)
        if not m.any():
            unmatched.append(base)
            continue
        for etat, sub in df[m].groupby("etat"):
            sub = sub[sub["search_priority"] == 0]
            if sub.empty:
                continue
            best = sub.assign(_len=sub["nom_origine"].str.len(), _pen=nm[sub.index].str.contains(PENALTY)).sort_values(["_pen", "micros_manquants", "_len"]).index[0]
            kept[(base, etat)] = (best, rank)
    for (base, etat), (best, rank) in kept.items():
        has_raw_or_cooked = (base, "Cru") in kept or (base, "Cuit") in kept
        txt = nm[best]
        if etat == "Prêt à consommer" and PENALTY.search(txt):
            if has_raw_or_cooked:
                continue  # une conserve ne devient pas « la carotte » quand la carotte crue et cuite existent
            tag = " (conserve)" if "appertis" in txt else " (fumé)" if "fume" in txt else " (surgelé)" if "surgel" in txt else ""
            df.at[best, "display_name"] = base + tag
        else:
            df.at[best, "display_name"] = base + {"Cru": " (cru)", "Cuit": " (cuit)"}.get(etat, "")
        df.at[best, "search_priority"] = 1
        df.at[best, "popularite"] = rank
    df.loc[df["source"].str.startswith("USDA"), "search_priority"] = 1
    grp = df["groupe"].map(norm)
    ncomma = df["nom_origine"].str.count(",")
    for i in df.index[df["search_priority"] == 0]:
        t3 = (df.at[i, "donnees_pauvres"] or any(g in grp[i] for g in T3_GROUPS) or TIER3_NAME.search(nm[i]) is not None or ncomma[i] >= 4
              or not any(g in grp[i] for g in T2_GROUPS))
        df.at[i, "search_priority"] = 3 if t3 else 2
    df["search_tags"] = [make_tags(d, o, s) for d, o, s in zip(df["display_name"], df["nom_origine"], df["sous_groupe"])]

    est = 4 * df["proteines_g"] + 4 * df["glucides_g"] + 9 * df["lipides_g"]
    df["alerte_coherence"] = (((est > df["kcal"] * 1.6 + 20) | (df["kcal"] > est * 1.6 + 40)) & (df["kcal"] > 0)
                              & ~df["groupe"].map(norm).str.contains("boissons"))
    df["id"] = df["source"].str.split().str[0].str.lower() + "-" + df["source_id"]

    print("5/5 Excel")
    front = ["id", "source", "source_id", "nom_origine", "display_name", "search_tags", "search_priority", "popularite", "groupe", "sous_groupe",
             "etat", "facteur_cuisson", "facteur_source", "unite_label", "poids_moyen_g", "portion_source"]
    cols = front + MACROS + ["kcal_source", "eau_g"] + MICROS + ["micros_manquants", "alerte_coherence", "donnees_pauvres"]
    out = df[cols].sort_values(["search_priority", "popularite", "display_name"]).reset_index(drop=True)
    for c in MACROS + ["eau_g"] + MICROS + ["poids_moyen_g"]:
        out[c] = out[c].astype(float)
    t1 = out[out["search_priority"] == 1]
    tier1 = t1[["id", "display_name", "nom_origine", "etat", "unite_label", "poids_moyen_g", "portion_source", "kcal",
                "kcal_source", "proteines_g", "glucides_g", "lipides_g", "fibres_g"]].copy()
    tier1["valide (oui/non)"] = ""
    tier1["correction"] = ""
    rapport = pd.DataFrame({"indicateur": [
        "Fiches Ciqual lues", "Exclues (aucune valeur nutritive)", "Energie recalculee (absente de Ciqual)",
        "Ecart median formule UE / Ciqual (aliments ayant les deux)", "Aliments USDA ajoutes", "Total livre",
        "Niveau 1", "Niveau 2", "Niveau 3", "Niveau 1 sans portion naturelle", "Portions par defaut (1 portion = 100 g)",
        "Facteurs de cuisson poses", "Alertes de coherence kcal / macros", "Regles niveau 1 sans fiche", "USDA introuvables",
    ], "valeur": [
        n0, len(excluded), calc_n, f"{rel.median():.1%}", len(added), len(out),
        int((out.search_priority == 1).sum()), int((out.search_priority == 2).sum()), int((out.search_priority == 3).sum()),
        int(((out.search_priority == 1) & (out.portion_source == "defaut")).sum()), int((out.portion_source == "defaut").sum()),
        int(out.facteur_cuisson.notna().sum()), int(out.alerte_coherence.sum()),
        ", ".join(unmatched) or "aucune", ", ".join(not_found) or "aucun",
    ]})
    path = OUT / "Master_Nutrition_DB.xlsx"
    with pd.ExcelWriter(path, engine="openpyxl") as xw:
        out.to_excel(xw, sheet_name="Aliments", index=False)
        tier1.to_excel(xw, sheet_name="Niveau1_a_valider", index=False)
        excluded[["source_id", "nom_origine", "groupe"]].to_excel(xw, sheet_name="Exclus", index=False)
        rapport.to_excel(xw, sheet_name="Rapport", index=False)
        for ws in xw.book.worksheets:
            ws.freeze_panes = "A2"
    out.to_csv(OUT / "master_nutrition_db.csv", index=False, encoding="utf-8")
    print(rapport.to_string(index=False))
    print(f"\n-> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
