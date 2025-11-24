// // import React from 'react';
// // import { View, ScrollView, StyleSheet, Text } from 'react-native';
// // import MealCard from './mealcard';
// // import { useRouter } from 'expo-router';
// // import imgg from '../assets/images/logo.jpg';

// // const meals = [
// //   {
// //     id: 1,
// //     name: 'Avocado Toast with Eggs',
// //     time: '8 min',
// //     calories: 250,
// //     image: imgg,
// //     macros: { carbs: 20, protein: 10, fat: 15 }
// //   },
// //   {
// //     id: 2,
// //     name: 'Pesto Chicken Penne Pasta',
// //     time: '25 min',
// //     calories: 600,
// //     image: imgg,
// //     macros: { carbs: 60, protein: 35, fat: 25 }
// //   },
// //   {
// //     id: 3,
// //     name: 'Fried Chicken Bowl',
// //     time: '40 min',
// //     calories: 750,
// //     image: imgg,
// //     macros: { carbs: 70, protein: 35, fat: 35 }
// //   }
// // ];

// // export default function Tracking() {
// //   const router = useRouter();

// //   return (
// //     <ScrollView style={styles.container}>
// //       <Text style={styles.heading}>Meal Plan</Text>
// //       {meals.map(meal => (
// //         <MealCard key={meal.id} meal={meal} router={router} />
// //       ))}
// //     </ScrollView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     padding: 10,
// //     backgroundColor: '#e6d6f5'
// //   },
// //   heading: {
// //     fontSize: 26,
// //     fontWeight: 'bold',
// //     textAlign: 'center',
// //     marginVertical: 16,
// //     color: '#4a0072'
// //   }
// // });


// import React from 'react';
// import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
// import MealCard from './mealcard';
// import { useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons'; // icon for back button
// import imgg from '../assets/images/logo.jpg';

// const meals = [
//   {
//     id: 1,
//     name: 'Avocado Toast with Eggs',
//     time: '8 min',
//     calories: 250,
//     image: imgg,
//     macros: { carbs: 20, protein: 10, fat: 15 }
//   },
//   {
//     id: 2,
//     name: 'Pesto Chicken Penne Pasta',
//     time: '25 min',
//     calories: 600,
//     image: imgg,
//     macros: { carbs: 60, protein: 35, fat: 25 }
//   },
//   {
//     id: 3,
//     name: 'Fried Chicken Bowl',
//     time: '40 min',
//     calories: 750,
//     image: imgg,
//     macros: { carbs: 70, protein: 35, fat: 35 }
//   }
// ];

// export default function Tracking() {
//   const router = useRouter();

//   return (
//     <ScrollView style={styles.container}>
//       {/* Back Button */}
//       <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
//         <Ionicons name="arrow-back" size={24} color="#4a0072" />
//         <Text style={styles.backText}>Back</Text>
//       </TouchableOpacity>

//       <Text style={styles.heading}>Meal Plan</Text>
//       {meals.map(meal => (
//         <MealCard key={meal.id} meal={meal} router={router} />
//       ))}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 10,
//     backgroundColor: '#e6d6f5',
//     flex: 1,
//   },
//   heading: {
//     fontSize: 26,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginVertical: 16,
//     color: '#4a0072'
//   },
//   backButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 10
//   },
//   backText: {
//     marginLeft: 6,
//     fontSize: 16,
//     color: '#4a0072',
//     fontWeight: 'bold'
//   }
// });





import React, { useState, useEffect, useImperativeHandle } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import MealCard from './mealcard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";


export default function Tracking() {
  const router = useRouter();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const baseURL = Constants.expoConfig.extra.BASE_URL;

  useEffect(() => {
      const fetchData = async () => {
        const storedId = await AsyncStorage.getItem("userId");
        console.log('storedid from tracking',storedId)
        if (storedId) {
          console.log("User ID from tracking:", storedId);
        setUserId(storedId);
        fetchDailyTotals(storedId);
        fetchWeeklyTotals(storedId);
        }
      };
      fetchData();
    }, []);
    
  
  // useEffect(() => {
  //   fetchUserId();
  //   const fetchMeals = async () => {
  //     try {
  //       // Replace 'userId' with actual user ID from your auth system
  //       const response = await axios.get(`http://192.168.1.27:5000/api/details/${userId}/meals`);
  //       setMeals(response.data);
  //     } catch (error) {
  //       console.error('Error fetching meals:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchMeals();
  // }, []);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        setLoading(true);
        console.log("sending user id to meals route from tracking",userId)
        const response = await fetch(`http://192.168.1.27:5000/api/details/${userId}/meals`);
        
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("meals data",meals)
        setMeals(data);
      } catch (error) {
        console.error('Fetch error:', error);
        // Optional: Set error state
        // setError(error.message);
      } finally {
        setLoading(false);
      }
    };
  
    if (userId) fetchMeals();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading meals...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#4a0072" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Meal Plan</Text>
      {meals.length > 0 ? (
        meals.map(meal => (
          <MealCard key={meal.id} meal={meal} router={router} />
        ))
      ) : (
        <Text style={styles.noMealsText}>No meals tracked yet</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    marginLeft: 8,
    color: '#4a0072',
    fontSize: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4a0072',
  },
  noMealsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});