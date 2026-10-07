const fs = require('fs');

let code = fs.readFileSync('src/shared/components/WeatherCard.tsx', 'utf8');

// 1. Import Dimensions
if (!code.includes('Dimensions')) {
  code = code.replace(
    "import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Animated, Easing } from 'react-native';",
    "import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Animated, Easing, Dimensions } from 'react-native';"
  );
}

// 2. Add scrollViewRef
if (!code.includes('scrollViewRef')) {
  code = code.replace(
    "const floatValue = useRef(new Animated.Value(0)).current;",
    "const floatValue = useRef(new Animated.Value(0)).current;\n  const scrollViewRef = useRef<ScrollView>(null);"
  );
}

// 3. Replace getFilteredHourly and add roundedLocalNowString
const getFilteredHourlyOld = `  const getFilteredHourly = () => {
    if (!weather?.hourly) return [];
    if (!selectedDate) {
      // Return next 24 hours from now
      const nowString = new Date().toISOString().substring(0, 14) + "00";
      let nowIdx = weather.hourly.findIndex(h => h.datetime >= nowString);
      if (nowIdx === -1) nowIdx = 0;
      return weather.hourly.slice(nowIdx, nowIdx + 24);
    } else {
      // Return all 24 hours of selected date
      return weather.hourly.filter(h => h.date === selectedDate);
    }
  };

  const displayHourly = getFilteredHourly();`;

const getFilteredHourlyNew = `  const getFilteredHourly = () => {
    if (!weather?.hourly) return [];
    
    // Si aucune date sélectionnée, on prend aujourd'hui localement
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    const todayDateStr = \`\${tYear}-\${tMonth}-\${tDay}\`;
    
    const targetDate = selectedDate || todayDateStr;
    return weather.hourly.filter(h => h.date === targetDate);
  };

  const displayHourly = getFilteredHourly();

  // Déterminer l'heure actuelle arrondie localement
  const getRoundedCurrentHourStr = () => {
    const d = new Date();
    if (d.getMinutes() >= 30) {
      // Si on est à la fin de la journée (ex: 23h45), on garde 23h pour rester sur le même jour
      if (d.getHours() < 23) {
        d.setHours(d.getHours() + 1);
      }
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    return \`\${year}-\${month}-\${day}T\${hours}:00\`;
  };
  
  const currentHourStr = getRoundedCurrentHourStr();
  const currentHourIndex = displayHourly.findIndex(h => h.datetime === currentHourStr);

  // Auto-scroll vers l'heure actuelle (seulement à l'ouverture ou au changement de jour)
  useEffect(() => {
    if (isModalVisible && displayHourly.length > 0) {
      setTimeout(() => {
        if (currentHourIndex !== -1 && scrollViewRef.current) {
          const itemWidth = 78; // width 68 + gap 10
          const screenHalf = Dimensions.get('window').width / 2;
          const xOffset = Math.max(0, currentHourIndex * itemWidth - screenHalf + (itemWidth / 2));
          scrollViewRef.current.scrollTo({ x: xOffset, animated: true });
        }
      }, 300);
    }
  }, [isModalVisible, selectedDate, currentHourIndex, displayHourly.length]);`;

code = code.replace(getFilteredHourlyOld, getFilteredHourlyNew);

// 4. Attach ref to ScrollView
code = code.replace(
  "<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 10 }}>",
  "<ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 10 }}>"
);

// 5. Update map to check isCurrentHour and apply style
const oldMap = `                  {displayHourly.length > 0 ? displayHourly.map((h, i) => (
                    <View key={i} style={styles.hourlyCard}>
                      <Text style={styles.hourlyTime}>{h.time}</Text>
                      <Feather name={getWeatherIcon(h.condition) as any} size={22} color={getWeatherIconColor(h.condition)} style={{ marginVertical: 8 }} />
                      <Text style={styles.hourlyTemp}>{h.temperature}°</Text>
                    </View>
                  )) : (`;
const newMap = `                  {displayHourly.length > 0 ? displayHourly.map((h, i) => {
                    // On surligne si c'est l'heure actuelle (et qu'on est sur le jour d'aujourd'hui)
                    const isCurrentHour = !selectedDate && h.datetime === currentHourStr;
                    return (
                      <View 
                        key={i} 
                        style={[
                          styles.hourlyCard, 
                          isCurrentHour && { 
                            borderColor: theme.colors.text, 
                            borderWidth: 2, 
                            backgroundColor: theme.colors.surface 
                          }
                        ]}
                      >
                        <Text style={[styles.hourlyTime, isCurrentHour && { fontWeight: '800', fontSize: 13 }]}>{h.time}</Text>
                        <Feather name={getWeatherIcon(h.condition) as any} size={22} color={getWeatherIconColor(h.condition)} style={{ marginVertical: 8 }} />
                        <Text style={[styles.hourlyTemp, isCurrentHour && { fontWeight: 'bold' }]}>{h.temperature}°</Text>
                      </View>
                    );
                  }) : (`;
code = code.replace(oldMap, newMap);

fs.writeFileSync('src/shared/components/WeatherCard.tsx', code);
console.log("Patched WeatherCard!");
