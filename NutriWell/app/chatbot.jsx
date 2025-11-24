import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";


export default function Chatbot() {
  const [query, setQuery] = useState("");
  const [chats, setChats] = useState([]);
  const scrollViewRef = useRef();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const baseURL = Constants.expoConfig.extra.BASE_URL;
  useEffect(() => {
      const fetchData = async () => {
        const storedId = await AsyncStorage.getItem("userId");
        console.log('storedid from chatbot',storedId)
        if (storedId) {
          console.log("User ID from chatbot:", storedId);
        setUserId(storedId);
        fetchDailyTotals(storedId);
        fetchWeeklyTotals(storedId);
        }
      };
      fetchData();
    }, []);
    

  const fetchAndSendToChatbot = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return; // Ensure there's a query to send
    
    const userChat = { userId: "User", text: trimmedQuery };
  
    // Clear the input first
    setQuery("");
    
    // Add user query to chat history
    setChats((prevChats) => [...prevChats, userChat]);
  
    try {
      // 1. Fetch today's meals and nutrition from Node.js backend
      console.log("user id before backend api",userId);
      const response = await fetch(`http://192.168.1.27:5000/api/details/${userId}/getTodaysMealsAndNutrition`);
      const mealData = await response.json(); // ✅ Store it in a variable
  
      console.log("meal data from backend", mealData);
  
      // 2. Send it to the Flask chatbot server
      const chatbotResponse = await axios.post(`http://192.168.1.27:5001/chatbot`, {
        userData: mealData,
        query: trimmedQuery,
      });
  
      console.log("Chatbot says:", chatbotResponse.data.response);
  
      // Add chatbot response to chat history
      const botChat = { user: "VitaBot", text: chatbotResponse.data.response };
      setChats((prevChats) => [...prevChats, botChat]);
  
    } catch (err) {
      console.error("Error fetching or sending data:", err);
      const errorChat = { user: "VitaBot", text: "Something went wrong." };
      setChats((prevChats) => [...prevChats, errorChat]);
    }
  };
  

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chats]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#007bff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>VitaBot</Text>

      <ScrollView
        style={styles.chatBox}
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 10 }}
      >
        {chats.map((chat, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              chat.user === "VitaBot" ? styles.bot : styles.user,
            ]}
          >
            <Text style={styles.messageText}>
              <Text style={styles.sender}>{chat.user}:</Text> {chat.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(text) => setQuery(text)}
          placeholder="Ask me..."
          onSubmitEditing={fetchAndSendToChatbot}
          returnKeyType="send"
          blurOnSubmit={true}
          multiline={false}
        />
        <TouchableOpacity onPress={fetchAndSendToChatbot} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backText: {
    marginLeft: 6,
    color: "#007bff",
    fontWeight: "600",
    fontSize: 16,
  },
  header: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  chatBox: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 18,
    maxWidth: "80%",
    marginBottom: 10,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: "#007bff",
  },
  bot: {
    alignSelf: "flex-start",
    backgroundColor: "#9b87c3",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fff",
  },
  sender: {
    fontWeight: "bold",
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 50,
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
  },
});