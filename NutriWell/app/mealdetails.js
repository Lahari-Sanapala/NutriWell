
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';


const NutrientChart = ({ label, percentage, gramValue, color, size = 80 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;

  // Ensure radius is always valid
  const safeRadius = isNaN(radius) || radius <= 0 ? 1 : radius;

  const circumference = 2 * Math.PI * safeRadius;

  // Safe percentage (0–100)
  const safePercent =
    isNaN(Number(percentage)) ? 0 : Math.min(Math.max(Number(percentage), 0), 100);

  // Safe gram value
  const safeGram = isNaN(Number(gramValue)) ? 0 : Number(gramValue);

  // FINAL SAFE VALUE for stroke offset
  const strokeDashoffset =
    circumference - (safePercent / 100) * circumference;

  const finalOffset = isNaN(strokeDashoffset) ? 0 : strokeDashoffset;

  return (
    <View style={styles.chartContainer}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#e0d0f0"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={safeRadius}
          strokeWidth={strokeWidth}
        />

        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={safeRadius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference || 1}
          strokeDashoffset={finalOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <Text style={styles.chartValue}>{safeGram}g</Text>
      <Text style={styles.chartLabel}>{label}</Text>
    </View>
  );
};

export default function MealDetail() {
  const router = useRouter();
  const { meal } = useLocalSearchParams();
  const parsedMeal = meal ? JSON.parse(meal) : null;

  if (!parsedMeal) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No meal data found!</Text>
      </View>
    );
  }

  const safeParse = (value) => {
    if (!value) return 0;
    const cleaned = String(value).replace(/[^\d.]/g, "");
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  };

  let macros = { carbs: 0, protein: 0, fat: 0 };

  if (parsedMeal.CalorieResponse) {
    const parts = parsedMeal.CalorieResponse.split(',');

    macros = {
      carbs: safeParse(parts[1]),
      protein: safeParse(parts[2]),
      fat: safeParse(parts[3]),
    };
  } else if (parsedMeal.macros) {
    macros = {
      carbs: safeParse(parsedMeal.macros.carbs),
      protein: safeParse(parsedMeal.macros.protein),
      fat: safeParse(parsedMeal.macros.fat),
    };
  }

  const total = macros.carbs + macros.protein + macros.fat;

  const getPercent = (g) => {
    if (!total || !g) return 0;
    return Math.round((g / total) * 100);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 30 }}>
            <Ionicons name="arrow-back" size={30} color="#4a0072" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Meal Details</Text>
          </View>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Image
              source={
                parsedMeal.base64Image
                  ? { uri: `data:image/jpeg;base64,${parsedMeal.base64Image}` }
                  : parsedMeal.image
              }
              style={styles.image}
            />

            <Text style={styles.name}>{parsedMeal.name}</Text>
            <Text style={styles.calories}>{parsedMeal.time} • {parsedMeal.calories}</Text>

            <View style={styles.macrosBox}>
              <Text style={styles.macroTitle}>Macronutrients</Text>

              <View style={styles.chartRow}>
                <NutrientChart
                  label="Carbs"
                  percentage={getPercent(macros.carbs)}
                  gramValue={macros.carbs}
                  color="#ffb74d"
                />

                <NutrientChart
                  label="Protein"
                  percentage={getPercent(macros.protein)}
                  gramValue={macros.protein}
                  color="#f06292"
                />

                <NutrientChart
                  label="Fat"
                  percentage={getPercent(macros.fat)}
                  gramValue={macros.fat}
                  color="#64b5f6"
                />
              </View>
            </View>

            <Text style={styles.name}>Summary</Text>
            <Text style={styles.calories}>{parsedMeal.summary}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e5f5',
  },
  safeArea: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 40,
  },
  scroll: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a0072',
  },
  card: {
    backgroundColor: '#f3e5f5',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a0072',
    textAlign: 'center',
    marginBottom: 6,
  },
  calories: {
    fontSize: 16,
    color: '#6a1b9a',
    textAlign: 'center',
    marginBottom: 16,
  },
  macrosBox: {
    backgroundColor: '#8c6ab8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  macroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartValue: {
    position: 'absolute',
    top: 22,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  chartLabel: {
    fontSize: 14,
    color: '#eaddff',
    marginTop: 8,
  },
  error: {
    fontSize: 18,
    color: 'red',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});