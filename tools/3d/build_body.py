# Construit le modèle 3D du check-in à partir de Z-Anatomy (CC BY-SA 4.0, dérivé de BodyParts3D CC BY-SA 2.1 JP).
# Regroupe muscles superficiels (+ quelques os visibles) en zones de douleur, une maille par zone et par côté,
# nommée "<zone>__<G|D|X>", allège le tout et exporte un GLB sans matériaux ni textures.
# Usage : blender -b --disable-autoexec --factory-startup zanatomy.blend --python build_body.py -- out.glb [budget_faces]
import bpy, bmesh, re, sys

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
BUDGET = int(args[1]) if len(args) > 1 else 160000

# (zone, une seule maille pour les deux côtés ?, motif sur le nom de base). L'ORDRE compte : première règle gagnante.
RULES = [
    ('pieds', False, r'^Tendon of extensor digitorum longus$'),
    ('tete', True, r'Epicranial aponeurosis|Frontalis|Temporoparietalis|Temporalis muscle|Occipitalis|orbicularis oculi|Nasalis|Procerus|Corrugator|Zygomaticus|Levator labii|Levator anguli|Levator nasolabialis|Depressor septi|Bucinator|Orbicularis oris|Risorius|Depressor anguli|Depressor labii|Mentalis|^(Parietal|Frontal|Occipital|Temporal|Zygomatic|Nasal) bone$|^Maxilla$|^Mandible$'),
    ('machoire', False, r'masseter$'),
    ('cou', True, r'Sternocleidomastoid|^Platysma$|Splenius capitis|Levator scapulae|^Scalenus (anterior|medius|posterior)|Omohyoid|Sternohyoid|Sternothyroid|Thyrohyoid|belly of digastric|Mylohyoid|Stylohyoid'),
    ('haut_dos', False, r'part of trapezius muscle$'),
    ('epaules', False, r'part of deltoid muscle$|^Supraspinatus|^Infraspinatus|^Teres minor|^Clavicle$|^Scapula$'),
    ('pectoraux', False, r'pectoralis major'),
    ('cotes', False, r'^Serratus anterior|^External intercostal'),
    ('biceps', False, r'biceps brachii$|^Brachialis muscle$|^Coracobrachialis'),
    ('triceps', False, r'triceps brachii$|^Anconeus'),
    ('avant_bras', False, r'^Brachioradialis|extensor carpi|flexor carpi|^Palmaris longus|flexor digitorum superficialis$|^Extensor digitorum$|^Extensor digiti minimi$|^Abductor pollicis longus$|^Extensor pollicis (longus|brevis)$|pronator teres$|^Ulna$|^Radius$'),
    ('poignets', False, r'retinaculum of wrist$|^(Scaphoid|Lunate|Pisiform|Trapezium|Capitate|Hamate|Trapezoid) bone$'),
    ('mains', False, r'pollicis brevis$|^Opponens pollicis|adductor pollicis$|digiti minimi (muscle )?of hand$|interossei muscles of hand$|^Palmar interossei|^Lumbrical muscles of hand$|^Palmar aponeurosis$|metacarpal bone$|finger of hand$'),
    ('abdominaux', True, r'^Rectus abdominis|^Pyramidalis|^Linea alba$'),
    ('obliques', False, r'^External abdominal oblique'),
    ('dorsaux', False, r'^Latissimus dorsi|^Teres major'),
    ('lombaires', False, r'^Iliocostalis (lumborum|thoracis)|^Longissimus thoracis|^Spinalis thoracis'),
    ('fessiers', False, r'^Gluteus (maximus|medius)'),
    ('hanches', False, r'^Tensor fasciae latae$|^Iliacus muscle$|^Psoas major$|^Hip bone$'),
    ('adducteurs', False, r'^Adductor (longus|magnus|brevis)$|^Gracilis|^Pectineus'),
    ('quadriceps', False, r'^Rectus femoris|^Vastus (lateralis|medialis)|^Sartorius|^Iliotibial tract$'),
    ('ischios', False, r'biceps femoris$|^Semimembranosus muscle$|^Semitendinosus'),
    ('genoux', False, r'^Patella$|^Popliteus|^Femur$'),
    ('mollets', False, r'gastrocnemius$|^Soleus|^Plantaris'),
    ('pieds', False, r'^Extensor digitorum brevis$|^Extensor hallucis brevis$|^Abductor hallucis$|digiti minimi of foot\)?$|^Flexor digitorum brevis$|^Plantar aponeurosis$|interossei muscles of foot$|^Plantar interossei|^(Calcaneus|Navicular bone|Cuboid bone)$|cuneiform bone$|metatarsal bone$|finger of foot$'),
    ('tibias', False, r'^Tibialis anterior|^Extensor digitorum longus$|^Extensor hallucis longus$|^Fibularis (longus|brevis|tertius)|^Tibia$|^Fibula$'),
    ('chevilles', False, r'^Calcaneal tendon$|retinaculum of ankle$|fibular retinaculum$|^Talus$'),
    ('os', True, r'^(Humerus|Sacrum|Manubrium of sternum|Body of sternum)$|^Vertebra (C[3-7]|T\d+|L\d)$'),
]
RULES = [(z, single, re.compile(p, re.I)) for z, single, p in RULES]

def find_col(prefix):
    return next(c for c in bpy.data.collections if c.name.startswith(prefix))

pool = set(find_col('4: Muscular system').all_objects) | set(find_col('1: Skeletal system').all_objects)
deps = bpy.context.evaluated_depsgraph_get()

groups = {}
matched = {}
for o in pool:
    if o.type != 'MESH' or len(o.data.polygons) == 0:
        continue
    base = re.sub(r'\.(r|l|j|g)$', '', o.name)
    side = 'D' if o.name.endswith('.r') else 'G' if o.name.endswith('.l') else 'X'
    rule = next((r for r in RULES if r[2].search(base)), None)
    if not rule:
        continue
    zone, single, _ = rule
    key = f"{zone}__{'X' if single else side}"
    if not single and side == 'X':
        # objet médian d'une zone latéralisée : on le range selon sa position (x < 0 = côté droit du sujet)
        key = f"{zone}__{'D' if o.matrix_world.translation.x < 0 else 'G'}"
    me = o.evaluated_get(deps).to_mesh()
    me.transform(o.matrix_world)
    bm = groups.setdefault(key, bmesh.new())
    bm.from_mesh(me)
    o.evaluated_get(deps).to_mesh_clear()
    matched.setdefault(key, []).append(o.name)

# Les abdominaux doivent rester touchables : l'oblique externe de Z-Anatomy inclut son aponévrose, qui
# recouvre tout le grand droit. On retire de l'oblique les faces situées devant le grand droit.
rect = groups.get('abdominaux__X')
if rect:
    xs = [v.co.x for v in rect.verts]
    zs = [v.co.z for v in rect.verts]
    half = max(abs(min(xs)), abs(max(xs))) * 1.08
    zmin, zmax = min(zs), max(zs)
    for k in ('obliques__D', 'obliques__G'):
        bm = groups.get(k)
        if not bm:
            continue
        doomed = []
        for f in bm.faces:
            c = f.calc_center_median()
            if abs(c.x) < half and zmin <= c.z <= zmax:
                doomed.append(f)
        bmesh.ops.delete(bm, geom=doomed, context='FACES')
        print('TRIM', k, len(doomed))

# Même chose au bas du dos : l'aponévrose du grand dorsal recouvre les lombaires. On la retire sur la
# hauteur lombaire (bas des muscles érecteurs + 22 cm) et sur leur largeur.
lomb = [groups.get('lombaires__D'), groups.get('lombaires__G')]
if all(lomb):
    zs = [v.co.z for bm in lomb for v in bm.verts]
    z0 = min(zs)
    z1 = z0 + 0.22
    band = [abs(v.co.x) for bm in lomb for v in bm.verts if z0 <= v.co.z <= z1]
    half = max(band) * 1.05
    for k in ('dorsaux__D', 'dorsaux__G'):
        bm = groups.get(k)
        if not bm:
            continue
        doomed = []
        for f in bm.faces:
            c = f.calc_center_median()
            if abs(c.x) < half and z0 <= c.z <= z1:
                doomed.append(f)
        bmesh.ops.delete(bm, geom=doomed, context='FACES')
        print('TRIM', k, len(doomed))

total = sum(len(bm.faces) for bm in groups.values())
ratio = min(1.0, BUDGET / max(total, 1))
print('groups', len(groups), 'faces in', total, 'ratio', round(ratio, 3))

scene = bpy.context.scene
out_col = bpy.data.collections.new('ExportBody')
scene.collection.children.link(out_col)
made = []
for key, bm in sorted(groups.items()):
    me = bpy.data.meshes.new(key)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(key, me)
    out_col.objects.link(ob)
    faces = len(me.polygons)
    r = max(ratio, min(1.0, 400 / max(faces, 1)))
    if r < 0.999:
        mod = ob.modifiers.new('dec', 'DECIMATE')
        mod.ratio = r
        bpy.context.view_layer.objects.active = ob
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
            bpy.ops.object.modifier_apply(modifier='dec')
    made.append(ob)

for o in bpy.context.view_layer.objects:
    o.select_set(False)
for ob in made:
    ob.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', use_selection=True, export_apply=True,
    export_normals=True, export_texcoords=False, export_materials='NONE', export_yup=True,
    export_animations=False, export_skins=False, export_morph=False, export_cameras=False, export_lights=False,
)
print('EXPORTED', OUT, 'faces out', sum(len(o.data.polygons) for o in made))
for key in sorted(matched):
    print('ZONE', key, len(matched[key]))
