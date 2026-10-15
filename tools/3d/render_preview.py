# Rend 3 vues (face, dos, 3/4) du GLB exporté, matière « argile » + zones colorées de test, pour juger le rendu.
import bpy, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
GLB, OUTDIR = args[0], args[1]
# Préfixes de mailles à colorer pour vérifier une zone : rouge puis orange (ex. "abdominaux" "obliques__G")
RED = tuple(args[2].split(',')) if len(args) > 2 else ('ischios__G',)
ORANGE = tuple(args[3].split(',')) if len(args) > 3 else ('genoux__D',)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']

def mat(name, rgb, rough=0.55):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    return m

clay = mat('clay', (0.80, 0.83, 0.88))
bone = mat('bone', (0.93, 0.90, 0.84))
pain = mat('pain', (0.94, 0.27, 0.27))
mid = mat('mid', (0.98, 0.45, 0.09))
for o in objs:
    o.data.materials.clear()
    n = o.name
    m = bone if n.startswith('os__') else pain if n.startswith(RED) else mid if n.startswith(ORANGE) else clay
    o.data.materials.append(m)

mn = Vector((min(v[0] for o in objs for v in o.bound_box), min(v[1] for o in objs for v in o.bound_box), min(v[2] for o in objs for v in o.bound_box)))
mx = Vector((max(v[0] for o in objs for v in o.bound_box), max(v[1] for o in objs for v in o.bound_box), max(v[2] for o in objs for v in o.bound_box)))
center = (mn + mx) / 2
height = (mx - mn).z

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
scene.render.resolution_x = 540
scene.render.resolution_y = 1000
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('w')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.93, 0.95, 0.97, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9

def light(loc, energy):
    d = bpy.data.lights.new('l', 'AREA')
    d.energy = energy
    d.size = 3
    o = bpy.data.objects.new('l', d)
    o.location = loc
    o.rotation_euler = (center - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(o)

cam_d = bpy.data.cameras.new('c')
cam_d.type = 'ORTHO'
cam_d.ortho_scale = height * 1.08
cam = bpy.data.objects.new('c', cam_d)
scene.collection.objects.link(cam)
scene.camera = cam

for name, ang in [('face', 0), ('dos', 180), ('trois_quarts', 35)]:
    for o in [o for o in scene.objects if o.type == 'LIGHT']:
        bpy.data.objects.remove(o)
    a = math.radians(ang)
    # Le sujet regarde vers +Y après import glTF (le -Y Blender d'origine) -> la caméra face est en -Y ? on teste les deux via le nom
    dirv = Vector((math.sin(a), -math.cos(a), 0))
    cam.location = center + dirv * 6
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    light(center + Vector((math.sin(a + 0.6) * 4, -math.cos(a + 0.6) * 4, 2.5)), 900)
    light(center + Vector((math.sin(a - 1.2) * 4, -math.cos(a - 1.2) * 4, 1.0)), 350)
    light(center + Vector((-math.sin(a) * 4, math.cos(a) * 4, 3.0)), 500)
    scene.render.filepath = f'{OUTDIR}/{name}.png'
    bpy.ops.render.render(write_still=True)
print('RENDERED')
