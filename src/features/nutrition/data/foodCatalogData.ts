export interface CatalogFiche {
  nom: string;
  aliases: string[];
  etat: string | null;
  code_ciqual: string;
  nom_ciqual: string;
  kcal_100g: number;
  proteines_100g: number;
  glucides_100g: number;
  lipides_100g: number;
  fibres_100g: number;
  unite: string;
  piece_g: number | null;
}

export const FOOD_CATALOG: CatalogFiche[] = 
[
  {
    "nom": "Blanc de poulet",
    "aliases": [
      "blanc de poulet",
      "filet de poulet",
      "escalope de poulet"
    ],
    "etat": "cuit",
    "code_ciqual": "36018",
    "nom_ciqual": "Poulet, filet sans peau grillé/poêlé",
    "kcal_100g": 141.0,
    "proteines_100g": 30.1,
    "glucides_100g": 0.0,
    "lipides_100g": 2.0,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Blanc de poulet",
    "aliases": [
      "blanc de poulet cru",
      "filet de poulet cru"
    ],
    "etat": "cru",
    "code_ciqual": "36017",
    "nom_ciqual": "Poulet, filet sans peau cru",
    "kcal_100g": 110.0,
    "proteines_100g": 23.4,
    "glucides_100g": 0.0,
    "lipides_100g": 1.5,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Cuisse de poulet",
    "aliases": [
      "cuisse de poulet"
    ],
    "etat": "cuit",
    "code_ciqual": "36006",
    "nom_ciqual": "Poulet, cuisse, viande rôtie/cuite au four",
    "kcal_100g": 171.0,
    "proteines_100g": 24.8,
    "glucides_100g": 0.0,
    "lipides_100g": 8.03,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Cuisse de poulet bouillie",
    "aliases": [
      "cuisse de poulet bouillie"
    ],
    "etat": "cuit",
    "code_ciqual": "36030",
    "nom_ciqual": "Poulet, cuisse, viande bouillie/cuite à l'eau",
    "kcal_100g": 188.0,
    "proteines_100g": 24.8,
    "glucides_100g": 0.7,
    "lipides_100g": 9.52,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Cuisse de poulet",
    "aliases": [
      "cuisse de poulet crue"
    ],
    "etat": "cru",
    "code_ciqual": "36024",
    "nom_ciqual": "Poulet, cuisse, viande crue",
    "kcal_100g": 114.0,
    "proteines_100g": 19.3,
    "glucides_100g": 0.0,
    "lipides_100g": 4.05,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Steak haché 5 %",
    "aliases": [
      "steak hache",
      "steak haché",
      "steaks haches"
    ],
    "etat": "cuit",
    "code_ciqual": "6251",
    "nom_ciqual": "Boeuf, steak haché 5% MG cuit",
    "kcal_100g": 155.0,
    "proteines_100g": 25.5,
    "glucides_100g": 0.0,
    "lipides_100g": 5.85,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Steak haché 5 %",
    "aliases": [
      "steak hache cru",
      "steak haché cru"
    ],
    "etat": "cru",
    "code_ciqual": "6250",
    "nom_ciqual": "Boeuf, steak haché 5% MG cru",
    "kcal_100g": 130.0,
    "proteines_100g": 21.9,
    "glucides_100g": 0.3,
    "lipides_100g": 4.59,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Steak de bœuf",
    "aliases": [
      "steak",
      "bifteck",
      "steak de boeuf"
    ],
    "etat": "cuit",
    "code_ciqual": "6200",
    "nom_ciqual": "Boeuf, steak ou bifteck grillé/poêlé",
    "kcal_100g": 128.0,
    "proteines_100g": 27.6,
    "glucides_100g": 0.0,
    "lipides_100g": 1.95,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Steak de bœuf",
    "aliases": [
      "steak cru",
      "bifteck cru"
    ],
    "etat": "cru",
    "code_ciqual": "6201",
    "nom_ciqual": "Boeuf, steak ou bifteck cru",
    "kcal_100g": 229.0,
    "proteines_100g": 18.7,
    "glucides_100g": 0.06,
    "lipides_100g": 17.2,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Faux-filet",
    "aliases": [
      "faux-filet",
      "faux filet"
    ],
    "etat": "cuit",
    "code_ciqual": "6105",
    "nom_ciqual": "Boeuf, faux-filet rôti/cuit au four",
    "kcal_100g": 194.0,
    "proteines_100g": 28.8,
    "glucides_100g": 0.0,
    "lipides_100g": 8.71,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Faux-filet",
    "aliases": [
      "faux-filet cru",
      "faux filet cru"
    ],
    "etat": "cru",
    "code_ciqual": "6111",
    "nom_ciqual": "Boeuf, faux-filet cru",
    "kcal_100g": 152.0,
    "proteines_100g": 22.3,
    "glucides_100g": 0.6,
    "lipides_100g": 6.74,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Jambon",
    "aliases": [
      "jambon",
      "jambon blanc",
      "jambon cuit"
    ],
    "etat": "cuit",
    "code_ciqual": "28906",
    "nom_ciqual": "Jambon cuit, supérieur, découenné dégraissé",
    "kcal_100g": 115.0,
    "proteines_100g": 20.3,
    "glucides_100g": 0.14,
    "lipides_100g": 3.66,
    "fibres_100g": 0.32,
    "unite": "piece",
    "piece_g": 40
  },
  {
    "nom": "Jambon sec",
    "aliases": [
      "jambon sec",
      "jambon cru"
    ],
    "etat": null,
    "code_ciqual": "28812",
    "nom_ciqual": "Jambon sec",
    "kcal_100g": 230.0,
    "proteines_100g": 28.7,
    "glucides_100g": 0.48,
    "lipides_100g": 12.6,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Jambon de poulet",
    "aliases": [
      "jambon de poulet"
    ],
    "etat": null,
    "code_ciqual": "28963",
    "nom_ciqual": "Jambon de poulet ou blanc de poulet en tranche",
    "kcal_100g": 105.0,
    "proteines_100g": 20.7,
    "glucides_100g": 1.39,
    "lipides_100g": 1.79,
    "fibres_100g": 0.53,
    "unite": "piece",
    "piece_g": 40
  },
  {
    "nom": "Saumon",
    "aliases": [
      "saumon",
      "saumon vapeur"
    ],
    "etat": "cuit",
    "code_ciqual": "26038",
    "nom_ciqual": "Saumon, cuit à la vapeur",
    "kcal_100g": 199.0,
    "proteines_100g": 23.0,
    "glucides_100g": 0.9,
    "lipides_100g": 11.5,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Saumon",
    "aliases": [
      "saumon cru"
    ],
    "etat": "cru",
    "code_ciqual": "26036",
    "nom_ciqual": "Saumon, élevage, cru",
    "kcal_100g": 193.0,
    "proteines_100g": 20.5,
    "glucides_100g": 0.0,
    "lipides_100g": 12.4,
    "fibres_100g": 0.25,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Saumon fumé",
    "aliases": [
      "saumon fume"
    ],
    "etat": null,
    "code_ciqual": "26037",
    "nom_ciqual": "Saumon fumé",
    "kcal_100g": 184.0,
    "proteines_100g": 22.2,
    "glucides_100g": 0.13,
    "lipides_100g": 10.5,
    "fibres_100g": 0.26,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Saumon poêlé",
    "aliases": [
      "saumon poele",
      "saumon grille"
    ],
    "etat": "cuit",
    "code_ciqual": "26229",
    "nom_ciqual": "Saumon, grillé/poêlé",
    "kcal_100g": 223.0,
    "proteines_100g": 25.5,
    "glucides_100g": 0.0,
    "lipides_100g": 13.5,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Thon au naturel",
    "aliases": [
      "thon au naturel",
      "thon en conserve"
    ],
    "etat": null,
    "code_ciqual": "26039",
    "nom_ciqual": "Thon, au naturel, appertisé, égoutté",
    "kcal_100g": 143.0,
    "proteines_100g": 26.8,
    "glucides_100g": 0.0,
    "lipides_100g": 3.94,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Thon",
    "aliases": [
      "thon",
      "thon cuit"
    ],
    "etat": "cuit",
    "code_ciqual": "26041",
    "nom_ciqual": "Thon, rôti/cuit au four",
    "kcal_100g": 136.0,
    "proteines_100g": 29.9,
    "glucides_100g": 0.0,
    "lipides_100g": 1.83,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Thon",
    "aliases": [
      "thon cru",
      "thon frais"
    ],
    "etat": "cru",
    "code_ciqual": "26053",
    "nom_ciqual": "Thon, cru",
    "kcal_100g": 155.0,
    "proteines_100g": 24.0,
    "glucides_100g": 2.72,
    "lipides_100g": 5.38,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Œuf",
    "aliases": [
      "oeuf cru"
    ],
    "etat": "cru",
    "code_ciqual": "22000",
    "nom_ciqual": "Oeuf cru",
    "kcal_100g": 140.0,
    "proteines_100g": 12.8,
    "glucides_100g": 0.06,
    "lipides_100g": 9.83,
    "fibres_100g": 0.0,
    "unite": "piece",
    "piece_g": 60
  },
  {
    "nom": "Blanc d'œuf",
    "aliases": [
      "blanc d'oeuf",
      "blanc d'œuf"
    ],
    "etat": "cru",
    "code_ciqual": "22001",
    "nom_ciqual": "Oeuf, blanc (blanc d'oeuf), cru",
    "kcal_100g": 48.1,
    "proteines_100g": 10.9,
    "glucides_100g": 0.73,
    "lipides_100g": 0.17,
    "fibres_100g": 0.0,
    "unite": "piece",
    "piece_g": 33
  },
  {
    "nom": "Œuf dur",
    "aliases": [
      "oeuf",
      "œuf",
      "oeufs",
      "oeuf dur"
    ],
    "etat": "cuit",
    "code_ciqual": "22010",
    "nom_ciqual": "Oeuf dur",
    "kcal_100g": 134.0,
    "proteines_100g": 13.5,
    "glucides_100g": 0.52,
    "lipides_100g": 8.62,
    "fibres_100g": 0.0,
    "unite": "piece",
    "piece_g": 60
  },
  {
    "nom": "Riz",
    "aliases": [
      "riz",
      "riz blanc",
      "riz cuit"
    ],
    "etat": "cuit",
    "code_ciqual": "9104",
    "nom_ciqual": "Riz blanc, cuit, sans sel ajouté",
    "kcal_100g": 155.0,
    "proteines_100g": 3.15,
    "glucides_100g": 33.2,
    "lipides_100g": 0.7,
    "fibres_100g": 1.4,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Riz",
    "aliases": [
      "riz cru",
      "riz blanc cru"
    ],
    "etat": "cru",
    "code_ciqual": "9100",
    "nom_ciqual": "Riz blanc, cru",
    "kcal_100g": 350.0,
    "proteines_100g": 7.02,
    "glucides_100g": 77.5,
    "lipides_100g": 0.79,
    "fibres_100g": 1.53,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Riz complet",
    "aliases": [
      "riz complet"
    ],
    "etat": "cuit",
    "code_ciqual": "9103",
    "nom_ciqual": "Riz complet, cuit, sans sel ajouté",
    "kcal_100g": 187.0,
    "proteines_100g": 3.87,
    "glucides_100g": 37.6,
    "lipides_100g": 1.8,
    "fibres_100g": 2.1,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Riz basmati",
    "aliases": [
      "riz basmati"
    ],
    "etat": "cuit",
    "code_ciqual": "9125",
    "nom_ciqual": "Riz basmati, cuit, sans sel ajouté",
    "kcal_100g": 148.0,
    "proteines_100g": 3.03,
    "glucides_100g": 32.9,
    "lipides_100g": 0.4,
    "fibres_100g": 0.5,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pâtes",
    "aliases": [
      "pates",
      "pâtes"
    ],
    "etat": "cuit",
    "code_ciqual": "9811",
    "nom_ciqual": "Pâtes sèches, standard, cuites, sans sel ajouté",
    "kcal_100g": 167.0,
    "proteines_100g": 6.1,
    "glucides_100g": 31.4,
    "lipides_100g": 1.1,
    "fibres_100g": 2.2,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pâtes",
    "aliases": [
      "pates crues",
      "pâtes sèches"
    ],
    "etat": "cru",
    "code_ciqual": "9810",
    "nom_ciqual": "Pâtes sèches, standard, crues",
    "kcal_100g": 364.0,
    "proteines_100g": 12.0,
    "glucides_100g": 72.7,
    "lipides_100g": 1.6,
    "fibres_100g": 2.91,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pâtes complètes",
    "aliases": [
      "pates completes",
      "pâtes complètes"
    ],
    "etat": "cuit",
    "code_ciqual": "9871",
    "nom_ciqual": "Pâtes sèches, au blé complet, cuites, sans sel ajouté",
    "kcal_100g": 179.0,
    "proteines_100g": 7.35,
    "glucides_100g": 31.3,
    "lipides_100g": 1.4,
    "fibres_100g": 5.1,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pâtes aux œufs",
    "aliases": [
      "pates aux oeufs"
    ],
    "etat": "cuit",
    "code_ciqual": "9816",
    "nom_ciqual": "Pâtes fraîches, aux oeufs, cuites, sans sel ajouté",
    "kcal_100g": 168.0,
    "proteines_100g": 5.76,
    "glucides_100g": 32.0,
    "lipides_100g": 1.3,
    "fibres_100g": 1.5,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pain",
    "aliases": [
      "pain",
      "pain blanc",
      "baguette"
    ],
    "etat": null,
    "code_ciqual": "7001",
    "nom_ciqual": "Pain blanc (par ex. : baguette, boule…)",
    "kcal_100g": 287.0,
    "proteines_100g": 8.27,
    "glucides_100g": 58.3,
    "lipides_100g": 1.4,
    "fibres_100g": 2.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pain complet",
    "aliases": [
      "pain complet"
    ],
    "etat": null,
    "code_ciqual": "7110",
    "nom_ciqual": "Pain complet ou intégral (à la farine T150)",
    "kcal_100g": 234.0,
    "proteines_100g": 8.66,
    "glucides_100g": 41.2,
    "lipides_100g": 1.7,
    "fibres_100g": 7.3,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pain pita",
    "aliases": [
      "pain pita",
      "pita"
    ],
    "etat": null,
    "code_ciqual": "7180",
    "nom_ciqual": "Pain pita",
    "kcal_100g": 249.0,
    "proteines_100g": 7.48,
    "glucides_100g": 48.8,
    "lipides_100g": 1.5,
    "fibres_100g": 3.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pomme de terre",
    "aliases": [
      "pomme de terre",
      "patate"
    ],
    "etat": "cuit",
    "code_ciqual": "4003",
    "nom_ciqual": "Pomme de terre, bouillie/cuite à l'eau",
    "kcal_100g": 81.0,
    "proteines_100g": 1.8,
    "glucides_100g": 16.8,
    "lipides_100g": 0.34,
    "fibres_100g": 1.8,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pomme de terre au four",
    "aliases": [
      "pomme de terre au four"
    ],
    "etat": "cuit",
    "code_ciqual": "4002",
    "nom_ciqual": "Pomme de terre, sans peau, rôtie/cuite au four",
    "kcal_100g": 91.9,
    "proteines_100g": 1.96,
    "glucides_100g": 20.1,
    "lipides_100g": 0.1,
    "fibres_100g": 1.5,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pomme de terre",
    "aliases": [
      "pomme de terre crue"
    ],
    "etat": "cru",
    "code_ciqual": "4008",
    "nom_ciqual": "Pomme de terre, sans peau, crue",
    "kcal_100g": 80.0,
    "proteines_100g": 2.02,
    "glucides_100g": 16.2,
    "lipides_100g": 0.09,
    "fibres_100g": 2.2,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Flocons d'avoine",
    "aliases": [
      "flocons d'avoine",
      "avoine",
      "flocons"
    ],
    "etat": null,
    "code_ciqual": "32140",
    "nom_ciqual": "Flocons d'avoine",
    "kcal_100g": 369.0,
    "proteines_100g": 10.6,
    "glucides_100g": 57.7,
    "lipides_100g": 7.82,
    "fibres_100g": 11.2,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Porridge",
    "aliases": [
      "porridge",
      "flocons cuits"
    ],
    "etat": "cuit",
    "code_ciqual": "9313",
    "nom_ciqual": "Flocons d'avoine bouillis/cuits à l'eau",
    "kcal_100g": 69.1,
    "proteines_100g": 2.54,
    "glucides_100g": 10.3,
    "lipides_100g": 1.52,
    "fibres_100g": 1.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Lait demi-écrémé",
    "aliases": [
      "lait",
      "lait demi-ecreme"
    ],
    "etat": null,
    "code_ciqual": "19041",
    "nom_ciqual": "Lait demi-écrémé, UHT",
    "kcal_100g": 47.7,
    "proteines_100g": 3.48,
    "glucides_100g": 5.0,
    "lipides_100g": 1.56,
    "fibres_100g": 0.0,
    "unite": "ml",
    "piece_g": null
  },
  {
    "nom": "Lait entier",
    "aliases": [
      "lait entier"
    ],
    "etat": null,
    "code_ciqual": "19023",
    "nom_ciqual": "Lait entier, UHT",
    "kcal_100g": 64.6,
    "proteines_100g": 3.46,
    "glucides_100g": 4.77,
    "lipides_100g": 3.55,
    "fibres_100g": 0.0,
    "unite": "ml",
    "piece_g": null
  },
  {
    "nom": "Yaourt",
    "aliases": [
      "yaourt",
      "yogourt",
      "yaourt nature"
    ],
    "etat": null,
    "code_ciqual": "19593",
    "nom_ciqual": "Yaourt ou lait fermenté, nature",
    "kcal_100g": 50.1,
    "proteines_100g": 3.83,
    "glucides_100g": 4.26,
    "lipides_100g": 1.68,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Yaourt 0 %",
    "aliases": [
      "yaourt 0",
      "yaourt 0%"
    ],
    "etat": null,
    "code_ciqual": "19594",
    "nom_ciqual": "Yaourt ou lait fermenté, nature, 0% MG",
    "kcal_100g": 39.1,
    "proteines_100g": 4.16,
    "glucides_100g": 4.89,
    "lipides_100g": 0.1,
    "fibres_100g": 0.031,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Fromage blanc",
    "aliases": [
      "fromage blanc"
    ],
    "etat": null,
    "code_ciqual": "19646",
    "nom_ciqual": "Fromage blanc, nature, 2-3% MG",
    "kcal_100g": 75.7,
    "proteines_100g": 7.28,
    "glucides_100g": 3.86,
    "lipides_100g": 3.23,
    "fibres_100g": 0.019,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Fromage blanc 0 %",
    "aliases": [
      "fromage blanc 0",
      "fromage blanc 0%"
    ],
    "etat": null,
    "code_ciqual": "19644",
    "nom_ciqual": "Fromage blanc, nature, 0% MG",
    "kcal_100g": 48.4,
    "proteines_100g": 7.34,
    "glucides_100g": 4.22,
    "lipides_100g": 0.1,
    "fibres_100g": 0.042,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pomme",
    "aliases": [
      "pomme"
    ],
    "etat": "cru",
    "code_ciqual": "13039",
    "nom_ciqual": "Pomme, chair et peau, crue",
    "kcal_100g": 54.0,
    "proteines_100g": 0.25,
    "glucides_100g": 11.6,
    "lipides_100g": 0.25,
    "fibres_100g": 1.4,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Banane",
    "aliases": [
      "banane"
    ],
    "etat": "cru",
    "code_ciqual": "13005",
    "nom_ciqual": "Banane, chair sans peau, crue",
    "kcal_100g": 87.6,
    "proteines_100g": 1.06,
    "glucides_100g": 19.7,
    "lipides_100g": 0.5,
    "fibres_100g": 2.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Fraise",
    "aliases": [
      "fraise",
      "fraises"
    ],
    "etat": "cru",
    "code_ciqual": "13014",
    "nom_ciqual": "Fraise, crue",
    "kcal_100g": 35.1,
    "proteines_100g": 0.63,
    "glucides_100g": 6.03,
    "lipides_100g": 0.5,
    "fibres_100g": 3.8,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Orange",
    "aliases": [
      "orange"
    ],
    "etat": "cru",
    "code_ciqual": "13034",
    "nom_ciqual": "Orange, chair sans peau, sans pépins, crue",
    "kcal_100g": 42.0,
    "proteines_100g": 0.75,
    "glucides_100g": 8.03,
    "lipides_100g": 0.5,
    "fibres_100g": 2.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Poire",
    "aliases": [
      "poire"
    ],
    "etat": "cru",
    "code_ciqual": "13037",
    "nom_ciqual": "Poire, chair et peau, crue",
    "kcal_100g": 56.6,
    "proteines_100g": 0.36,
    "glucides_100g": 12.3,
    "lipides_100g": 0.27,
    "fibres_100g": 2.9,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Beurre",
    "aliases": [
      "beurre",
      "beurre doux"
    ],
    "etat": null,
    "code_ciqual": "16400",
    "nom_ciqual": "Beurre à 80% MG minimum, doux",
    "kcal_100g": 753.0,
    "proteines_100g": 0.64,
    "glucides_100g": 0.71,
    "lipides_100g": 83.0,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Beurre demi-sel",
    "aliases": [
      "beurre demi-sel",
      "beurre sale"
    ],
    "etat": null,
    "code_ciqual": "16402",
    "nom_ciqual": "Beurre à 80% MG, demi-sel",
    "kcal_100g": 725.0,
    "proteines_100g": 0.75,
    "glucides_100g": 0.5,
    "lipides_100g": 80.0,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Huile d'olive",
    "aliases": [
      "huile d'olive",
      "huile olive"
    ],
    "etat": null,
    "code_ciqual": "17270",
    "nom_ciqual": "Huile d'olive vierge extra",
    "kcal_100g": 899.0,
    "proteines_100g": 0.25,
    "glucides_100g": 0.0,
    "lipides_100g": 99.9,
    "fibres_100g": 0.0,
    "unite": "ml",
    "piece_g": null
  },
  {
    "nom": "Amande",
    "aliases": [
      "amande",
      "amandes"
    ],
    "etat": null,
    "code_ciqual": "15000",
    "nom_ciqual": "Amande, avec peau, sans sel ajouté",
    "kcal_100g": 615.0,
    "proteines_100g": 18.8,
    "glucides_100g": 9.51,
    "lipides_100g": 51.3,
    "fibres_100g": 12.5,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Cacahuète",
    "aliases": [
      "cacahuete",
      "cacahuète",
      "arachide"
    ],
    "etat": null,
    "code_ciqual": "15001",
    "nom_ciqual": "Cacahuète, sans sel ajouté",
    "kcal_100g": 623.0,
    "proteines_100g": 22.8,
    "glucides_100g": 14.8,
    "lipides_100g": 49.1,
    "fibres_100g": 8.6,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Noix",
    "aliases": [
      "noix"
    ],
    "etat": null,
    "code_ciqual": "15005",
    "nom_ciqual": "Noix, cerneau, séchée",
    "kcal_100g": 709.0,
    "proteines_100g": 13.3,
    "glucides_100g": 6.88,
    "lipides_100g": 67.3,
    "fibres_100g": 6.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Lentilles",
    "aliases": [
      "lentille",
      "lentilles"
    ],
    "etat": "cuit",
    "code_ciqual": "20360",
    "nom_ciqual": "Lentille, bouillie/cuite à l'eau (aliment moyen)",
    "kcal_100g": 125.0,
    "proteines_100g": 10.1,
    "glucides_100g": 16.2,
    "lipides_100g": 0.57,
    "fibres_100g": 8.45,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Lentilles",
    "aliases": [
      "lentilles seches"
    ],
    "etat": "cru",
    "code_ciqual": "20359",
    "nom_ciqual": "Lentille, sèche (aliment moyen)",
    "kcal_100g": 327.0,
    "proteines_100g": 25.1,
    "glucides_100g": 44.5,
    "lipides_100g": 1.8,
    "fibres_100g": 16.3,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pois chiches",
    "aliases": [
      "pois chiche",
      "pois chiches"
    ],
    "etat": "cuit",
    "code_ciqual": "20507",
    "nom_ciqual": "Pois chiche, bouilli/cuit à l'eau",
    "kcal_100g": 148.0,
    "proteines_100g": 8.31,
    "glucides_100g": 17.7,
    "lipides_100g": 3.0,
    "fibres_100g": 8.2,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Pois chiches",
    "aliases": [
      "pois chiches secs"
    ],
    "etat": "cru",
    "code_ciqual": "20516",
    "nom_ciqual": "Pois chiche, sec",
    "kcal_100g": 350.0,
    "proteines_100g": 20.5,
    "glucides_100g": 47.5,
    "lipides_100g": 6.04,
    "fibres_100g": 12.2,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Haricots verts",
    "aliases": [
      "haricot vert",
      "haricots verts"
    ],
    "etat": "cuit",
    "code_ciqual": "20030",
    "nom_ciqual": "Haricot vert, cuit",
    "kcal_100g": 29.4,
    "proteines_100g": 2.0,
    "glucides_100g": 3.0,
    "lipides_100g": 0.17,
    "fibres_100g": 4.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Haricots verts",
    "aliases": [
      "haricots verts crus"
    ],
    "etat": "cru",
    "code_ciqual": "20061",
    "nom_ciqual": "Haricot vert, cru",
    "kcal_100g": 31.9,
    "proteines_100g": 1.83,
    "glucides_100g": 4.14,
    "lipides_100g": 0.22,
    "fibres_100g": 2.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Brocoli",
    "aliases": [
      "brocoli"
    ],
    "etat": "cuit",
    "code_ciqual": "20304",
    "nom_ciqual": "Brocoli, cuit à la vapeur",
    "kcal_100g": 38.0,
    "proteines_100g": 4.13,
    "glucides_100g": 2.53,
    "lipides_100g": 0.7,
    "fibres_100g": 2.2,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Brocoli",
    "aliases": [
      "brocoli cru"
    ],
    "etat": "cru",
    "code_ciqual": "20057",
    "nom_ciqual": "Brocoli, cru",
    "kcal_100g": 31.9,
    "proteines_100g": 2.9,
    "glucides_100g": 2.15,
    "lipides_100g": 0.36,
    "fibres_100g": 2.6,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Courgette",
    "aliases": [
      "courgette",
      "courgettes"
    ],
    "etat": "cuit",
    "code_ciqual": "20021",
    "nom_ciqual": "Courgette, chair et peau, cuite",
    "kcal_100g": 15.5,
    "proteines_100g": 0.93,
    "glucides_100g": 1.4,
    "lipides_100g": 0.36,
    "fibres_100g": 1.5,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Courgette",
    "aliases": [
      "courgette crue"
    ],
    "etat": "cru",
    "code_ciqual": "20020",
    "nom_ciqual": "Courgette, chair et peau, crue",
    "kcal_100g": 16.7,
    "proteines_100g": 1.21,
    "glucides_100g": 1.75,
    "lipides_100g": 0.32,
    "fibres_100g": 1.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Carotte",
    "aliases": [
      "carotte",
      "carottes"
    ],
    "etat": "cuit",
    "code_ciqual": "20307",
    "nom_ciqual": "Carotte, cuite à la vapeur",
    "kcal_100g": 40.3,
    "proteines_100g": 0.63,
    "glucides_100g": 7.33,
    "lipides_100g": 0.3,
    "fibres_100g": 3.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Carotte",
    "aliases": [
      "carotte crue"
    ],
    "etat": "cru",
    "code_ciqual": "20009",
    "nom_ciqual": "Carotte, crue",
    "kcal_100g": 30.2,
    "proteines_100g": 0.78,
    "glucides_100g": 5.16,
    "lipides_100g": 0.5,
    "fibres_100g": 2.9,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Tomate",
    "aliases": [
      "tomate",
      "tomates"
    ],
    "etat": "cru",
    "code_ciqual": "20276",
    "nom_ciqual": "Tomate ronde, crue",
    "kcal_100g": 17.5,
    "proteines_100g": 0.5,
    "glucides_100g": 3.42,
    "lipides_100g": 0.5,
    "fibres_100g": 1.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Tomate cerise",
    "aliases": [
      "tomate cerise"
    ],
    "etat": "cru",
    "code_ciqual": "20172",
    "nom_ciqual": "Tomate cerise, crue",
    "kcal_100g": 31.8,
    "proteines_100g": 1.31,
    "glucides_100g": 5.62,
    "lipides_100g": 0.5,
    "fibres_100g": 1.2,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Avocat",
    "aliases": [
      "avocat"
    ],
    "etat": "cru",
    "code_ciqual": "13004",
    "nom_ciqual": "Avocat, chair sans peau, sans noyau, cru",
    "kcal_100g": 203.0,
    "proteines_100g": 1.56,
    "glucides_100g": 0.0,
    "lipides_100g": 20.6,
    "fibres_100g": 3.6,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Quinoa",
    "aliases": [
      "quinoa"
    ],
    "etat": "cuit",
    "code_ciqual": "9341",
    "nom_ciqual": "Quinoa, bouilli/cuit à l'eau, sans sel ajouté",
    "kcal_100g": 149.0,
    "proteines_100g": 4.66,
    "glucides_100g": 27.9,
    "lipides_100g": 1.1,
    "fibres_100g": 3.8,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Quinoa",
    "aliases": [
      "quinoa cru"
    ],
    "etat": "cru",
    "code_ciqual": "9340",
    "nom_ciqual": "Quinoa, cru",
    "kcal_100g": 358.0,
    "proteines_100g": 13.2,
    "glucides_100g": 58.1,
    "lipides_100g": 6.07,
    "fibres_100g": 7.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Semoule",
    "aliases": [
      "semoule",
      "couscous"
    ],
    "etat": "cuit",
    "code_ciqual": "9683",
    "nom_ciqual": "Semoule ou graine de couscous, cuite, sans sel ajouté",
    "kcal_100g": 164.0,
    "proteines_100g": 5.81,
    "glucides_100g": 31.0,
    "lipides_100g": 0.9,
    "fibres_100g": 2.8,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Semoule",
    "aliases": [
      "semoule crue"
    ],
    "etat": "cru",
    "code_ciqual": "9610",
    "nom_ciqual": "Semoule de blé dur, crue",
    "kcal_100g": 350.0,
    "proteines_100g": 11.8,
    "glucides_100g": 69.8,
    "lipides_100g": 1.28,
    "fibres_100g": 3.7,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Maïs",
    "aliases": [
      "mais",
      "maïs"
    ],
    "etat": null,
    "code_ciqual": "20066",
    "nom_ciqual": "Maïs doux, appertisé, égoutté",
    "kcal_100g": 105.0,
    "proteines_100g": 2.66,
    "glucides_100g": 18.3,
    "lipides_100g": 1.68,
    "fibres_100g": 3.1,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Crevette",
    "aliases": [
      "crevette",
      "crevettes"
    ],
    "etat": "cuit",
    "code_ciqual": "10007",
    "nom_ciqual": "Crevette, cuite",
    "kcal_100g": 91.3,
    "proteines_100g": 20.5,
    "glucides_100g": 0.2,
    "lipides_100g": 0.79,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Crevette",
    "aliases": [
      "crevettes crues"
    ],
    "etat": "cru",
    "code_ciqual": "10021",
    "nom_ciqual": "Crevette, crue",
    "kcal_100g": 99.0,
    "proteines_100g": 19.7,
    "glucides_100g": 3.21,
    "lipides_100g": 0.84,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Escalope de dinde",
    "aliases": [
      "escalope de dinde",
      "dinde"
    ],
    "etat": "cuit",
    "code_ciqual": "36306",
    "nom_ciqual": "Dinde, escalope grillée/poêlée",
    "kcal_100g": 124.0,
    "proteines_100g": 28.5,
    "glucides_100g": 0.0,
    "lipides_100g": 1.09,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Escalope de dinde",
    "aliases": [
      "dinde crue"
    ],
    "etat": "cru",
    "code_ciqual": "36304",
    "nom_ciqual": "Dinde, escalope crue",
    "kcal_100g": 108.0,
    "proteines_100g": 23.7,
    "glucides_100g": 0.0,
    "lipides_100g": 1.48,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Filet mignon de porc",
    "aliases": [
      "filet mignon",
      "filet de porc",
      "porc"
    ],
    "etat": "cuit",
    "code_ciqual": "28203",
    "nom_ciqual": "Porc, filet mignon cuit",
    "kcal_100g": 168.0,
    "proteines_100g": 26.1,
    "glucides_100g": 0.0,
    "lipides_100g": 7.1,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  },
  {
    "nom": "Filet mignon de porc",
    "aliases": [
      "filet mignon cru",
      "porc cru"
    ],
    "etat": "cru",
    "code_ciqual": "28204",
    "nom_ciqual": "Porc, filet mignon cru",
    "kcal_100g": 123.0,
    "proteines_100g": 21.2,
    "glucides_100g": 0.4,
    "lipides_100g": 4.09,
    "fibres_100g": 0.0,
    "unite": "g",
    "piece_g": null
  }
]
;
