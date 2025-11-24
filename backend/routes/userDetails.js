const express = require("express");
const router = express.Router();
//const UserDetails = require("../models/UserDetails");
const axios = require('axios')
const User = require("../models/UserDetails");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const { getAllNotifications } = require('../storage/store');
require("dotenv").config();

const baseURL = process.env.BASE_URL;
const getIndianDate = () => {
  // Create date object
  const date = new Date();
  
  // Get timezone offset for India (IST is UTC+5:30)
  const timezoneOffset = date.getTimezoneOffset();
  
  // Calculate Indian time (add 5 hours 30 minutes)
  const indianTime = new Date(date.getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000));
  
  // Format as YYYY-MM-DD
  return indianTime.toISOString().split('T')[0];
};

router.post("/submit", async (req, res) => {
  try {
    const { userId, ...details } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const userIdd = new mongoose.Types.ObjectId(userId);
    // const existing = await User.findOne({ userId: userIdd });
    const existing = await User.findById(userIdd) // if you're querying by _id


    if (existing) {
      await User.findOneAndUpdate({ userId: userIdd }, details);
      return res.json({ message: "Updated successfully" });
    }

    const userDetails = new User({ userId: userIdd, ...details });

   

    await userDetails.save();
    res.status(201).json({ message: "Details saved", userDetails });
  } catch (err) {
    console.error("Error in /submit:", err);
    res.status(500).json({ message: "Error saving details", error: err.message });
  }
});

router.post("/upload-image", async (req, res) => {
  

  try {
    const { userId, base64Image } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const userIdd = new mongoose.Types.ObjectId(userId);

  if (!userIdd || !base64Image) {
    return res.status(400).json({ error: "Missing userId or base64Image" });
  }
   // ✅ Step 1: Find the user from DB
   console.log("we got user id from frontend in upload image route",userIdd)
   const user = await User.findById(userIdd);
   if (!user) {
     return res.status(404).json({ error: "User not found" });
   }

   
    
    const pythonResponse = await axios.post(`http://${baseURL}:8501/analyze`, {
      base64Image
  });

  const summary = pythonResponse.data?.summary || "No summary returned";
  console.log("🍽 Summary:", summary);

  // Send summary to get calorie estimation
  const pythonResponseCalorie = await axios.post(`http://${baseURL}:8501/analyzeCalorie`, {
      summary
  });

  console.log("🍽 Calorie response data:", pythonResponseCalorie.data);

  const CalorieResponse = pythonResponseCalorie.data['CalorieResponse'] || "No CalorieResponse returned";

    const newFoodEntry = {
      base64Image,
      CalorieResponse,
      summary
    };

    user.food.push(newFoodEntry);
    await user.save();

    const newIndex = user.food.length - 1;

    res.status(200).json({ message: "Image uploaded", food: {
      image: base64Image,
      summary,
      calorieInfo: CalorieResponse
    },
 foodIndex: newIndex });
  } catch (error) {
    console.error("❌ Upload Image Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


function extractMealName(summary) {
  if (!summary) return 'Unnamed Meal';
  const match = summary.match(/Meal Name:\s*(.*?)(\n|$)/i);
  return match ? match[1].trim() : 'Unnamed Meal';
}

router.get('/:userId/meals', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const userIdd = new mongoose.Types.ObjectId(req.params.userId);
    const user = await User.findOne({ userId: userIdd }); 
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get current system date (without time component)
    const currentDate = getIndianDate();

    // Filter meals created today
    const todaysMeals = user.food.filter(meal => {
      const mealDate = new Date(meal.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      console.log("meal date",mealDate)
      return mealDate === currentDate;
    });

    const formattedMeals = todaysMeals.map(meal => {
      const calories = meal.CalorieResponse ? 
        meal.CalorieResponse.split(',')[0].trim() : 
        '0';
      
      return {
        id: meal._id,
        name: extractMealName(meal.summary),
        time: new Date(meal.createdAt).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        calories: calories + ' cal',
        base64Image: meal.base64Image,
        summary: meal.summary,
        macros: meal.CalorieResponse ? {
          carbs: meal.CalorieResponse.split(',')[1].trim(),
          protein: meal.CalorieResponse.split(',')[2].trim(),
          fat: meal.CalorieResponse.split(',')[3].trim()
        } : { carbs: 0, protein: 0, fat: 0 }
      };
    });

    res.json(formattedMeals);
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// routes/userDetails.js
router.get('/:userId/daily-totals', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const userIdd = new mongoose.Types.ObjectId(req.params.userId);
    const currentDate = getIndianDate();
    console.log("current system date",currentDate)

    const user = await User.findById(userIdd);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const todaysMeals = user.food.filter(meal => {
      const mealDate = new Date(meal.createdAt).toISOString().split('T')[0];
      return mealDate === currentDate;
    });

    // Calculate totals
    const totals = todaysMeals.reduce((acc, meal) => {
      if (meal.CalorieResponse) {
        const [calories, carbs, protein, fat] = meal.CalorieResponse.split(',').map(Number);
        
        if (
          !isNaN(calories) &&
          !isNaN(carbs) &&
          !isNaN(protein) &&
          !isNaN(fat)
        ) {
          acc.calories += calories;
          acc.carbs += carbs;
          acc.protein += protein;
          acc.fat += fat;
        }
      }
      return acc;
    }, { calories: 0, carbs: 0, protein: 0, fat: 0 });

    res.json({
      totals,
      mealCount: todaysMeals.length
    });
  } catch (error) {
    console.error('Error fetching daily totals:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:userId/weekly-totals', async (req, res) => {
  try {
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const userIdd = new mongoose.Types.ObjectId(req.params.userId);
    
    // Get pure date strings for the 7-day range (YYYY-MM-DD format)
    const today = getIndianDate();
    const dateStrings = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateStrings.push(date.toISOString().split('T')[0]);
    }

    const user = await User.findById(userIdd);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Initialize totals
    const weeklyTotals = { calories: 0, carbs: 0, protein: 0, fat: 0 };
    const dailyBreakdown = {};
    
    // Initialize empty days
    dateStrings.forEach(date => {
      dailyBreakdown[date] = { 
        calories: 0, 
        carbs: 0, 
        protein: 0, 
        fat: 0, 
        mealCount: 0 
      };
    });

    // Process each meal
    user.food.forEach(meal => {
      const mealDate = new Date(meal.createdAt).toISOString().split('T')[0];
      
      // Only process if meal is within our 7-day window
      if (dateStrings.includes(mealDate)) {
        if (meal.CalorieResponse) {
          const [calories, carbs, protein, fat] = meal.CalorieResponse.split(',').map(Number);
          
          if (
            !isNaN(calories) &&
            !isNaN(carbs) &&
            !isNaN(protein) &&
            !isNaN(fat)
          ) {
            dailyBreakdown[mealDate].calories += calories;
            dailyBreakdown[mealDate].carbs += carbs;
            dailyBreakdown[mealDate].protein += protein;
            dailyBreakdown[mealDate].fat += fat;
            dailyBreakdown[mealDate].mealCount += 1;
          
            weeklyTotals.calories += calories;
            weeklyTotals.carbs += carbs;
            weeklyTotals.protein += protein;
            weeklyTotals.fat += fat;
          }
          
        }
      }
    });

    // Convert daily breakdown to sorted array (newest first)
    const sortedDailyBreakdown = dateStrings
      .map(date => ({
        date,
        ...dailyBreakdown[date]
      }))
      .reverse(); // Most recent day first

    res.json({
      weeklyTotals,
      dailyBreakdown: sortedDailyBreakdown,
      mealCount: Object.values(dailyBreakdown).reduce((sum, day) => sum + day.mealCount, 0)
    });

  } catch (error) {
    console.error('Error fetching weekly totals:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:userId/edit-details', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const userDetails = await User.findOne({ userId: userId });
    if (!userDetails) return res.status(404).json({ error: "User details not found" });

    res.json(userDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});




router.get('/:userId/getTodaysMealsAndNutrition', async (req, res) => {
  //const { userId } = req.params.userId;
  const currentDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const userIdd = new mongoose.Types.ObjectId(req.params.userId);
    console.log("user id in backend route getTodayMealsandnutritiron",userIdd);
    const user = await User.findById(userIdd);

    //const user = await User.findOne({ userId : userIdd });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Filter today's meals
    const todaysMeals = user.food.filter(meal => {
      const mealDate = moment(meal.createdAt).tz("Asia/Kolkata").format("YYYY-MM-DD");
      return mealDate === currentDate;
    });

    // Aggregate nutrition
    const { totalNutrition, summaries } = todaysMeals.reduce(
      (acc, meal) => {
        if (meal.CalorieResponse) {
          const [calories, carbs, protein, fat] = meal.CalorieResponse.split(',').map(Number);
    
          acc.totalNutrition.calories += isNaN(calories) ? 0 : calories;
          acc.totalNutrition.carbs += isNaN(carbs) ? 0 : carbs;
          acc.totalNutrition.protein += isNaN(protein) ? 0 : protein;
          acc.totalNutrition.fat += isNaN(fat) ? 0 : fat;
        }
    
        if (meal.summary) {
          const MealName=extractMealName(meal.summary);
          acc.summaries.push(MealName);
        }
    
        return acc;
      },
      {
        totalNutrition: { calories: 0, carbs: 0, protein: 0, fat: 0 },
        summaries: [],
      }
    );
    

    // Send all useful info
    // meals: todaysMeals,
    res.status(200).json({
      userName: user.name,
      age: user.age,
      gender: user.gender,
      sleepHours: user.sleepHours,
      healthIssues: user.healthIssues,
      date: currentDate,
    
      totalNutrition,
      summaries,
    });

    

  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});



// GET /notifications
router.get('/', (req, res) => {
  const notifications = getAllNotifications();
  res.json(notifications);
});


module.exports = router;




//module.exports = { getTodaysMealsAndNutrition };




//module.exports = router;


// Get all meals for a user
// router.get('/:userId/meals', async (req, res) => {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
//       return res.status(400).json({ error: 'Invalid user ID format' });
//     }

//     // 2. Convert to ObjectId
//     const userIdd = new mongoose.Types.ObjectId(req.params.userId);
//     const user = await User.findOne({ userId: userIdd });
//     if (!user) return res.status(404).json({ error: 'User not found' });

//     const formattedMeals = user.food.map(meal => {
//       const calories = meal.CalorieResponse ? 
//         meal.CalorieResponse.split(',')[0].trim() : 
//         '0';
      
//       return {
//         id: meal._id,
//         name: extractMealName(meal.summary),
//         time: new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//         calories: calories + ' kcal',
//         base64Image: meal.base64Image,
//         summary: meal.summary,
//         macros: meal.CalorieResponse ? {
//           carbs: meal.CalorieResponse.split(',')[1].trim(),
//           protein: meal.CalorieResponse.split(',')[2].trim(),
//           fat: meal.CalorieResponse.split(',')[3].trim()
//         } : { carbs: 0, protein: 0, fat: 0 }
//       };
//     });

//     res.json(formattedMeals);
//   } catch (error) {
//     console.error('Error fetching meals:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// });



