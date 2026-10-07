const fs = require('fs');
const lines = fs.readFileSync('modal_backup.tsx', 'utf8').split('\n');

let stateLine = -1;
let performStart = -1;
let performEnd = -1;
let renderReviewStart = -1;
let renderFallbackStart = -1; // The final ) : ( block

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const [mode, setMode] = useState")) stateLine = i;
  if (lines[i].includes("const performAIAnalysis = async")) performStart = i;
  if (lines[i].includes("const confirmAIMeal = async")) performEnd = i - 1;
  if (lines[i].includes(") : mode === 'ai-review' ? (")) renderReviewStart = i;
  if (renderReviewStart !== -1 && lines[i].includes(") : (") && !lines[i].includes("?")) renderFallbackStart = i;
}

if (renderFallbackStart === -1) {
  // Try to find the fallback block differently
  for (let i = renderReviewStart + 1; i < lines.length; i++) {
    if (lines[i].trim() === ") : (") {
      renderFallbackStart = i;
      break;
    }
  }
}

console.log("Indices:", { stateLine, performStart, performEnd, renderReviewStart, renderFallbackStart });

if (stateLine !== -1 && performStart !== -1 && renderReviewStart !== -1 && renderFallbackStart !== -1) {
  lines[stateLine] = "  const [mode, setMode] = useState<'text' | 'barcode' | 'ai-text' | 'ai-loading' | 'ai-review'>('text');\n  const [aiOriginalText, setAiOriginalText] = useState('');\n  const [isEditingList, setIsEditingList] = useState(false);";

  // Replace performAIAnalysis
  const newPerform = `  const performAIAnalysis = async (input: { text?: string; base64Image?: string }) => {
    if (input.text) setAiOriginalText(input.text);
    if (input.base64Image) setAiOriginalText('Photo de mon assiette');
    setMode('ai-loading');
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
  };`;

  lines.splice(performStart, performEnd - performStart + 1, newPerform);
  
  // Re-calculate after splice
  let newReviewStart = -1;
  let newFallbackStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(") : mode === 'ai-review' ? (")) newReviewStart = i;
    if (newReviewStart !== -1 && lines[i].trim() === ") : (") newFallbackStart = i;
  }

  // Update confirmAIMeal
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("setAiParsedMeal([]);")) {
      lines[i] = "    setAiParsedMeal([]);\n    setAiOriginalText('');\n    setIsEditingList(false);";
      break;
    }
  }

  const newRender = `        ) : mode === 'ai-loading' ? (
          <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
             <View style={[styles.header, { marginBottom: 24 }]}>
               <TouchableOpacity onPress={() => setMode('ai-text')} style={styles.iconButton}>
                   <Feather name="arrow-left" size={28} color={theme.colors.text} />
               </TouchableOpacity>
               <Text style={[styles.title, { color: theme.colors.text }]}>Analyse en cours...</Text>
               <View style={{ width: 28 }} />
             </View>

             <View style={{ backgroundColor: '#E8F7F3', padding: 16, borderRadius: 12, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1B5E20', marginBottom: 4 }}>Voici ce que nous avons compris</Text>
                  <Text style={{ fontSize: 16, color: '#2E7D32', fontStyle: 'italic' }}>"{aiOriginalText}"</Text>
                </View>
                <Feather name="message-square" size={24} color="#81C784" />
             </View>

             <View style={{ gap: 16 }}>
                <View style={{ height: 32, width: '70%', backgroundColor: theme.colors.border, borderRadius: 8, opacity: 0.5 }} />
                <View style={{ height: 20, width: '40%', backgroundColor: theme.colors.border, borderRadius: 4, opacity: 0.5 }} />
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                </View>
             </View>
          </View>
        ) : mode === 'ai-review' ? (
          <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
             <View style={[styles.header, { marginBottom: 24 }]}>
               <TouchableOpacity onPress={() => setMode('ai-text')} style={styles.iconButton}>
                   <Feather name="arrow-left" size={28} color={theme.colors.text} />
               </TouchableOpacity>
               <Text style={[styles.title, { color: theme.colors.text }]}>
                 {aiParsedMeal.length > 1 ? "Résumé du repas" : ""}
               </Text>
               <View style={{ width: 28 }} />
             </View>

             <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
               <View style={{ backgroundColor: '#E8F7F3', padding: 16, borderRadius: 12, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1B5E20', marginBottom: 4 }}>Voici ce que nous avons compris</Text>
                    <Text style={{ fontSize: 16, color: '#2E7D32', fontStyle: 'italic' }}>"{aiOriginalText}"</Text>
                  </View>
                  <Feather name="message-square" size={24} color="#81C784" />
               </View>

               {aiParsedMeal.length === 1 && (
                 <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: 20 }}>
                   {aiParsedMeal[0].name}
                 </Text>
               )}

               {/* GRILLE 2x2 TOTALE */}
               {(() => {
                 let tKcal = 0, tPro = 0, tGlu = 0, tLip = 0;
                 let allCiqual = aiParsedMeal.length > 0;
                 
                 aiParsedMeal.forEach(item => {
                   const isMatched = !!item.matchedItem;
                   const isCiqual = isMatched && item.matchedItem?.type === 'ciqual';
                   if (!isMatched || !isCiqual) allCiqual = false;

                   let weightG = item.qty;
                   if (item.unit === 'piece') weightG = item.qty * 60;
                   const mult = weightG / 100;
                   
                   const bKcal = isMatched ? (isCiqual ? (item.matchedItem?.item as any).energie_kcal : ((item.matchedItem?.item as any).macros_100g?.calories || 0)) : item.fallback_kcal_100g;
                   const bPro = isMatched ? (isCiqual ? (item.matchedItem?.item as any).proteines : ((item.matchedItem?.item as any).macros_100g?.proteines || 0)) : item.fallback_pro_100g;
                   const bGlu = isMatched ? (isCiqual ? (item.matchedItem?.item as any).glucides : ((item.matchedItem?.item as any).macros_100g?.glucides || 0)) : item.fallback_glu_100g;
                   const bLip = isMatched ? (isCiqual ? (item.matchedItem?.item as any).lipides : ((item.matchedItem?.item as any).macros_100g?.lipides || 0)) : item.fallback_lip_100g;

                   tKcal += bKcal * mult; tPro += bPro * mult; tGlu += bGlu * mult; tLip += bLip * mult;
                 });

                 return (
                   <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 24 }}>
                     <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: theme.colors.border }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{Math.round(tKcal)} kcal</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Calories</Text>
                        </View>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{tGlu.toFixed(1)} g</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Glucides</Text>
                        </View>
                     </View>
                     <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: theme.colors.border }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{tPro.toFixed(1)} g</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Protéines</Text>
                        </View>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{tLip.toFixed(1)} g</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Matières grasses</Text>
                        </View>
                     </View>
                     <View style={{ padding: 12, backgroundColor: theme.colors.surfaceLight, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                          {allCiqual ? "Vérifié CIQUAL" : "Estimation"}
                        </Text>
                     </View>
                   </View>
                 );
               })()}

               {(aiParsedMeal.length > 1 || isEditingList) ? (
                  <View style={{ gap: 12, marginBottom: 24 }}>
                    {aiParsedMeal.map((item, index) => {
                       const isMatched = !!item.matchedItem;
                       const isCiqual = isMatched && item.matchedItem?.type === 'ciqual';
                       let weightG = item.qty;
                       if (item.unit === 'piece') weightG = item.qty * 60;
                       
                       const bKcal = isMatched ? (isCiqual ? (item.matchedItem?.item as any).energie_kcal : ((item.matchedItem?.item as any).macros_100g?.calories || 0)) : item.fallback_kcal_100g;
                       const totalKcal = Math.round(bKcal * (weightG / 100));

                       return (
                         <View key={index} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                            <View style={{ flex: 1 }}>
                               <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{item.name}</Text>
                               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                  <TextInput 
                                    style={{ fontSize: 14, color: theme.colors.text, borderBottomWidth: 1, borderBottomColor: theme.colors.border, minWidth: 40, textAlign: 'center', marginRight: 4, padding: 0 }}
                                    keyboardType="numeric"
                                    value={weightG.toString()}
                                    onChangeText={(val) => {
                                       const num = parseInt(val) || 0;
                                       const newArr = [...aiParsedMeal];
                                       newArr[index] = { ...item, qty: num, unit: 'g' };
                                       setAiParsedMeal(newArr);
                                    }}
                                  />
                                  <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>g  •  {totalKcal} kcal</Text>
                               </View>
                            </View>
                            <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 8 }}>
                               <Feather name="x" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                         </View>
                       );
                    })}
                  </View>
               ) : (
                  <TouchableOpacity onPress={() => setIsEditingList(true)} style={{ paddingVertical: 12, alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1B5E20' }}>Ajouter ou modifier des éléments</Text>
                  </TouchableOpacity>
               )}
             </ScrollView>

             <TouchableOpacity 
                 style={{ backgroundColor: '#1C1C1E', borderRadius: 100, paddingVertical: 16, alignItems: 'center', opacity: isLoading ? 0.7 : 1 }} 
                 onPress={confirmAIMeal}
                 disabled={isLoading}
             >
                 {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                 ) : (
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Confirmer et ajouter</Text>
                 )}
             </TouchableOpacity>
          </View>
        ) : mode === 'ai-text' ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={{ padding: 16, flex: 1 }}>
              <View style={[styles.header, { marginBottom: 32 }]}>
                <TouchableOpacity onPress={() => setMode('text')} style={styles.iconButton}>
                    <Feather name="arrow-left" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ width: 28 }} />
              </View>

              <Text style={{ fontSize: 32, fontWeight: '800', color: theme.colors.text, marginBottom: 24, lineHeight: 38 }}>
                Dites-nous ce que{"\\n"}vous mangez
              </Text>

              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    padding: 16,
                    paddingBottom: 40,
                    fontSize: 16,
                    color: theme.colors.text,
                    minHeight: 180,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Une cuillère à soupe de sauce huître"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  autoFocus
                  maxLength={500}
                  value={aiQuery}
                  onChangeText={setAiQuery}
                />
                
                <Text style={{ position: 'absolute', bottom: 16, left: 16, fontSize: 12, color: theme.colors.textSecondary }}>
                  {500 - (aiQuery || '').length} caractères restants
                </Text>
                
                <TouchableOpacity style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F7F3', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="mic" size={16} color="#1B5E20" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ padding: 16, paddingBottom: 32 }}>
              <TouchableOpacity 
                style={{ backgroundColor: '#1C1C1E', borderRadius: 100, paddingVertical: 16, alignItems: 'center', opacity: (!aiQuery || !aiQuery.trim() || isAILoading) ? 0.5 : 1 }}
                onPress={handleAIText}
                disabled={!aiQuery || !aiQuery.trim() || isAILoading}
              >
                {isAILoading ? (
                   <ActivityIndicator color="#FFF" />
                ) : (
                   <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Analyser mon repas</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>`;

  lines.splice(newReviewStart, newFallbackStart - newReviewStart, newRender);

  fs.writeFileSync('src/features/nutrition/components/FoodSearchModal.tsx', lines.join('\n'));
  console.log("SUCCESSFULLY PATCHED USING LINE REPLACEMENT!");
} else {
  console.log("Failed to find some lines:", { stateLine, performStart, performEnd, renderReviewStart, renderFallbackStart });
}
