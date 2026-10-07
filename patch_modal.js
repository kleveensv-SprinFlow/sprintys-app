const fs = require('fs');
let code = fs.readFileSync('src/features/nutrition/components/FoodSearchModal.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { aiNutritionService } from '../../../services/aiNutritionService';",
  "import { aiNutritionService, ParsedFoodItem } from '../../../services/aiNutritionService';"
);

// 2. Add mode type and state
code = code.replace(
  "const [mode, setMode] = useState<'text' | 'barcode' | 'ai-text'>('text');",
  "const [mode, setMode] = useState<'text' | 'barcode' | 'ai-text' | 'ai-review'>('text');\n  const [aiParsedMeal, setAiParsedMeal] = useState<(ParsedFoodItem & { matchedItem?: HybridFoodResult })[]>([]);"
);

// 3. Replace performAIAnalysis
const oldPerform = `  const performAIAnalysis = async (input: { text?: string; base64Image?: string }) => {
    setIsAILoading(true);
    const result = await aiNutritionService.analyzeFood(input);
    setIsAILoading(false);

    if (result) {
      const aiMockProduct: OFFProduct = {
        id: \`ai-\${Date.now()}\`,
        name: result.name,
        brand: 'Estimation IA ✨',
        image_url: '',
        macros_100g: {
          calories: (result.calories / result.quantity_g) * 100,
          proteines: (result.proteines / result.quantity_g) * 100,
          glucides: (result.glucides / result.quantity_g) * 100,
          lipides: (result.lipides / result.quantity_g) * 100,
        }
      };
      
      setSelectedProduct(aiMockProduct);
      setMode('text');
      setAiQuery('');
    } else {
      Alert.alert("Erreur", "L'IA n'a pas pu analyser cette demande.");
    }
  };`;

const newPerform = `  const performAIAnalysis = async (input: { text?: string; base64Image?: string }) => {
    setIsAILoading(true);
    const parsedItems = await aiNutritionService.analyzeFood(input);
    setIsAILoading(false);

    if (parsedItems && parsedItems.length > 0) {
      const matchedArray = await Promise.all(parsedItems.map(async (item) => {
         const results = await nutritionService.searchFoodHybrid(item.query);
         if (results.length > 0) {
            return { ...item, matchedItem: results[0] };
         }
         return item;
      }));
      setAiParsedMeal(matchedArray);
      setMode('ai-review');
    } else {
      Alert.alert("Erreur", "L'IA n'a pas pu analyser cette demande.");
    }
  };

  const confirmAIMeal = async () => {
    if (!activeSearchMealType) return;
    setIsLoading(true);
    for (const item of aiParsedMeal) {
      let f_id = undefined;
      let f_name = item.name;
      let kcal = item.fallback_kcal_100g;
      let pro = item.fallback_pro_100g;
      let glu = item.fallback_glu_100g;
      let lip = item.fallback_lip_100g;

      if (item.matchedItem) {
        if (item.matchedItem.type === 'ciqual') {
           const c = item.matchedItem.item as CiqualFood;
           f_id = c.id;
           f_name = c.nom;
           kcal = c.energie_kcal;
           pro = c.proteines;
           glu = c.glucides;
           lip = c.lipides;
        } else {
           const o = item.matchedItem.item as OFFProduct;
           f_id = o.id;
           f_name = o.name;
           kcal = o.macros_100g?.calories || 0;
           pro = o.macros_100g?.proteines || 0;
           glu = o.macros_100g?.glucides || 0;
           lip = o.macros_100g?.lipides || 0;
        }
      }

      let weightG = item.qty;
      if (item.unit === 'piece') weightG = item.qty * 60;

      const multiplier = weightG / 100;

      await addMealLog({
        meal_type: activeSearchMealType,
        consumed_at: currentDate,
        food_id: f_id,
        custom_food_name: f_name,
        quantity_g: weightG,
        calories: Math.round(kcal * multiplier),
        proteines: Math.round(pro * multiplier),
        glucides: Math.round(glu * multiplier),
        lipides: Math.round(lip * multiplier),
      });
    }
    setIsLoading(false);
    setMode('text');
    setAiQuery('');
    setAiParsedMeal([]);
    closeSearchModal();
  };

  const removeItem = (index: number) => {
    const newArr = [...aiParsedMeal];
    newArr.splice(index, 1);
    setAiParsedMeal(newArr);
    if (newArr.length === 0) setMode('text');
  };`;
code = code.replace(oldPerform, newPerform);

// 4. Render UI for ai-review
const renderReview = `
        {mode === 'ai-review' ? (
          <View style={{ flex: 1, padding: 16 }}>
             <View style={styles.header}>
               <TouchableOpacity onPress={() => setMode('text')} style={styles.iconButton}>
                   <Feather name="arrow-left" size={28} color={theme.colors.text} />
               </TouchableOpacity>
               <Text style={[styles.title, { color: theme.colors.text }]}>Confirmation</Text>
               <View style={{ width: 28 }} />
             </View>

             <ScrollView style={{ flex: 1, marginTop: 16 }}>
                {aiParsedMeal.map((item, index) => {
                   const isMatched = !!item.matchedItem;
                   const isCiqual = isMatched && item.matchedItem.type === 'ciqual';
                   const f_name = isMatched ? (isCiqual ? (item.matchedItem.item as CiqualFood).nom : (item.matchedItem.item as OFFProduct).name) : item.name;
                   let weightG = item.qty;
                   if (item.unit === 'piece') weightG = item.qty * 60;
                   const baseKcal = isMatched 
                       ? (isCiqual ? (item.matchedItem.item as CiqualFood).energie_kcal : ((item.matchedItem.item as OFFProduct).macros_100g?.calories || 0)) 
                       : item.fallback_kcal_100g;
                   const totalKcal = Math.round(baseKcal * (weightG / 100));

                   return (
                     <View key={index} style={[styles.resultItem, { borderBottomColor: theme.colors.border, justifyContent: 'space-between', paddingVertical: 12 }]}>
                        <View style={{ flex: 1 }}>
                           <Text style={[styles.productName, { color: theme.colors.text }]}>{f_name}</Text>
                           <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]}>
                             {item.qty} {item.unit} ({weightG}g) • {totalKcal} kcal {isCiqual ? '🛡️' : (isMatched ? '🛒' : '✨ Estimé')}
                           </Text>
                        </View>
                        <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 8 }}>
                           <Feather name="trash-2" size={20} color="#FF6B6B" />
                        </TouchableOpacity>
                     </View>
                   );
                })}
             </ScrollView>

             <TouchableOpacity 
                 style={[styles.aiSubmitBtn, { marginTop: 16, opacity: isLoading ? 0.5 : 1 }]} 
                 onPress={confirmAIMeal}
                 disabled={isLoading}
             >
                 <LinearGradient colors={['#0069E8', '#00DCFD']} style={styles.aiSubmitGradient}>
                     {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                     ) : (
                        <>
                           <Text style={styles.aiSubmitText}>Valider le repas</Text>
                           <Feather name="check" size={20} color="#FFF" />
                        </>
                     )}
                 </LinearGradient>
             </TouchableOpacity>
          </View>
        ) : mode === 'ai-text' ? (`;

code = code.replace("        {mode === 'ai-text' ? (", renderReview);

fs.writeFileSync('src/features/nutrition/components/FoodSearchModal.tsx', code);
console.log("Patched successfully!");
