import React, { useState, useEffect } from 'react';
import { Moon, Sun, Play, Edit3, RotateCcw, CheckCircle, XCircle, BookOpen, Save, Plus, Trash2, Upload, Cloud, AlertTriangle, Shuffle, Filter } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyD8jZUpuD_M_q2AYJxDTRjhQS1HB6A4h_I",
  authDomain: "special-laws-quizzer.firebaseapp.com",
  projectId: "special-laws-quizzer",
  storageBucket: "special-laws-quizzer.firebasestorage.app",
  messagingSenderId: "83375891896",
  appId: "1:83375891896:web:1e24102dcf84317ccf5b4d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'special-laws-quizzer';

// Utility function to shuffle arrays
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [topics, setTopics] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTopic, setActiveTopic] = useState(null);
  const [appError, setAppError] = useState('');
  
  // Session State (for randomized taking)
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [setupModal, setSetupModal] = useState({ isOpen: false, topic: null, type: null }); // type: 'quiz' | 'flashcards'
  const [isRandomized, setIsRandomized] = useState(false);

  // Cloud Auth State
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  // 1. Initialize Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
        setAppError("Firebase Authentication failed. Please make sure 'Anonymous' sign-in is enabled in your Firebase Console.");
        setIsSyncing(false);
      }
    };
    
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Fetch Data from Public Cloud Collection
  useEffect(() => {
    if (!user) return; // Guard: Wait for auth

    setIsSyncing(true);
    setAppError(''); 
    
    const topicsRef = collection(db, 'artifacts', appId, 'public', 'data', 'quiz_topics');
    
    const unsubscribe = onSnapshot(topicsRef, (snapshot) => {
      const fetchedTopics = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTopics(fetchedTopics);
      setIsSyncing(false);
    }, (error) => {
      console.error("Error fetching cloud topics:", error);
      setAppError("Failed to fetch quizzes from the cloud. Please check your Firestore Security Rules (they might be blocking access).");
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Toggle Dark Mode on Body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // --- NAVIGATION & SETUP HANDLERS ---
  const createNewTopic = () => {
    const newTopic = {
      id: `topic-${Date.now()}`,
      title: "New Law Topic",
      questions: []
    };
    setActiveTopic(newTopic);
    setCurrentView('edit');
  };

  const initiateSetup = (topic, type) => {
    setSetupModal({ isOpen: true, topic, type });
    setIsRandomized(false); // Default to ordered
  };

  const confirmStart = () => {
    let questionsToUse = [...setupModal.topic.questions];
    if (isRandomized) {
      questionsToUse = shuffleArray(questionsToUse);
    }
    
    setSessionQuestions(questionsToUse);
    setActiveTopic(setupModal.topic);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setScore(0);
    setCurrentView(setupModal.type);
    setSetupModal({ isOpen: false, topic: null, type: null });
  };

  const openEdit = (topic) => {
    setActiveTopic(topic);
    setCurrentView('edit');
  };

  const goHome = () => {
    setCurrentView('dashboard');
    setActiveTopic(null);
    setSessionQuestions([]);
  };

  const submitQuiz = () => {
    let currentScore = 0;
    sessionQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswerIndex) {
        currentScore++;
      }
    });
    setScore(currentScore);
    setCurrentView('review');
  };

  // --- COMPONENTS ---

  const SetupModal = () => {
    if (!setupModal.isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Configure Session
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">{setupModal.topic.title}</p>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl mb-8 border border-gray-200 dark:border-gray-700">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Shuffle size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Randomize Order</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Shuffle questions for this session</p>
                </div>
             </div>
             
             {/* Toggle Switch */}
             <button 
                onClick={() => setIsRandomized(!isRandomized)}
                className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${isRandomized ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ease-in-out ${isRandomized ? 'translate-x-7' : 'translate-x-1'}`} />
             </button>
          </div>

          <div className="flex justify-end gap-3">
             <button 
               onClick={() => setSetupModal({isOpen: false, topic: null, type: null})} 
               className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition"
             >
               Cancel
             </button>
             <button 
               onClick={confirmStart} 
               className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center gap-2"
             >
               Start {setupModal.type === 'quiz' ? 'Quiz' : 'Flashcards'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in relative">
      <SetupModal />
      
      {appError && (
        <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-6 rounded shadow-sm flex items-start justify-between">
          <div className="flex gap-3">
             <AlertTriangle className="shrink-0" />
             <p className="text-sm font-medium">{appError}</p>
          </div>
          <button onClick={() => setAppError('')} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Special Laws Quizzer
            {isSyncing ? (
               <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse"><Cloud size={12}/> Syncing...</span>
            ) : user && !appError ? (
               <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><Cloud size={12}/> Online</span>
            ) : (
               <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1">Offline</span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Accountancy Review Application</p>
        </div>
        <button onClick={toggleTheme} className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-yellow-400 hover:bg-gray-300 dark:hover:bg-gray-700 transition">
          {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Quiz Banks</h2>
         <button onClick={createNewTopic} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm">
           <Plus size={18} /> New Topic
         </button>
      </div>

      <div className="grid gap-6">
        {topics.length === 0 && !isSyncing && (
           <div className="text-center p-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400">
              No topics found in the cloud. Click "New Topic" to get started!
           </div>
        )}
        {topics.map(topic => (
          <div key={topic.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 transition-all hover:border-blue-200 dark:hover:border-blue-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{topic.title}</h2>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => initiateSetup(topic, 'quiz')} disabled={topic.questions.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">
                <Play size={18} /> Practice Mode ({topic.questions?.length || 0})
              </button>
              <button onClick={() => initiateSetup(topic, 'flashcards')} disabled={topic.questions.length === 0} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">
                <BookOpen size={18} /> Flashcards
              </button>
              <button onClick={() => openEdit(topic)} className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-5 py-2.5 rounded-lg font-medium transition">
                <Edit3 size={18} /> Edit & Manage
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-blue-50 dark:bg-gray-800/50 p-6 rounded-xl border border-blue-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Instructions</h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Generate law topics via AI and paste the generated JSON code into the "Edit & Manage" section to update your quiz banks. 
            Questions are saved to the cloud and instantly visible to anyone sharing this app instance.
          </p>
      </div>
    </div>
  );

  const Quizzer = () => {
    const question = sessionQuestions[currentQuestionIndex];
    const isLast = currentQuestionIndex === sessionQuestions.length - 1;
    const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;

    // Calculate Live Tally
    let correctCount = 0;
    let wrongCount = 0;
    Object.keys(userAnswers).forEach((key) => {
      const idx = parseInt(key);
      if (userAnswers[idx] === sessionQuestions[idx].correctAnswerIndex) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    return (
      <div className="max-w-3xl mx-auto p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeTopic.title}</h2>
             <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-bold px-3 py-1 rounded-full mt-2 inline-block uppercase tracking-wider">
               Question {currentQuestionIndex + 1} of {sessionQuestions.length}
             </span>
          </div>
          
          {/* Live Score Tally */}
          <div className="flex gap-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
             <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Correct</span>
                <span className="text-xl font-black text-green-500">{correctCount}</span>
             </div>
             <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
             <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Wrong</span>
                <span className="text-xl font-black text-red-500">{wrongCount}</span>
             </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 mb-6 relative overflow-hidden">
          {/* Question Text */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider font-semibold">
            {question.type === 'theory' ? 'Theoretical Problem' : 'Situational/Computational'}
          </p>
          <p className="text-lg text-gray-900 dark:text-gray-100 whitespace-pre-line mb-8 font-medium">
            {question.question}
          </p>

          {/* Options */}
          <div className="grid gap-3">
            {question.options.map((opt, idx) => {
              // Styling logic for instant feedback
              let optionClass = "flex items-start p-4 rounded-lg border-2 transition-all ";
              if (hasAnswered) {
                if (idx === question.correctAnswerIndex) {
                   optionClass += "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100";
                } else if (idx === userAnswers[currentQuestionIndex]) {
                   optionClass += "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100";
                } else {
                   optionClass += "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed";
                }
              } else {
                optionClass += "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer";
              }

              return (
                <label key={idx} className={optionClass}>
                  <input 
                    type="radio" 
                    name={`quiz-option-${currentQuestionIndex}`}
                    disabled={hasAnswered}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                    checked={userAnswers[currentQuestionIndex] === idx}
                    onChange={() => {
                      if (!hasAnswered) {
                        setUserAnswers({...userAnswers, [currentQuestionIndex]: idx});
                      }
                    }}
                  />
                  <span className="ml-3 font-medium">{opt}</span>
                </label>
              );
            })}
          </div>

          {/* Instant Explanation Reveal */}
          {hasAnswered && (
             <div className="mt-8 p-5 bg-blue-50 dark:bg-gray-750 border border-blue-100 dark:border-gray-600 rounded-xl animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                   {userAnswers[currentQuestionIndex] === question.correctAnswerIndex ? (
                      <span className="flex items-center gap-1 text-green-600 font-bold uppercase tracking-wider text-sm"><CheckCircle size={16}/> Correct!</span>
                   ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold uppercase tracking-wider text-sm"><XCircle size={16}/> Incorrect</span>
                   )}
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">Explanation:</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{question.explanation}</p>
             </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-4">
            <button onClick={goHome} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition font-medium">Exit</button>
            <button onClick={submitQuiz} className="text-orange-500 hover:text-orange-600 transition font-medium flex items-center gap-1 text-sm border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg">
               <AlertTriangle size={14}/> End Early & Score
            </button>
          </div>
          <div className="flex gap-4">
            <button 
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Previous
            </button>
            {isLast ? (
              <button 
                onClick={submitQuiz}
                disabled={!hasAnswered}
                className="px-6 py-2.5 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition shadow-sm"
              >
                View Final Score
              </button>
            ) : (
              <button 
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                disabled={!hasAnswered}
                className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ReviewView = () => {
    const [filterWrong, setFilterWrong] = useState(false);
    const totalAnswered = Object.keys(userAnswers).length;

    return (
      <div className="max-w-4xl mx-auto p-6 animate-fade-in relative pb-24">
        <SetupModal />
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Session Completed</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            You scored <span className="font-bold text-blue-600 dark:text-blue-400">{score}</span> out of {totalAnswered} answered
          </p>
          <p className="text-sm text-gray-500 mt-1">Total questions in this bank: {sessionQuestions.length}</p>

          <div className="flex justify-center gap-4 mt-6">
             <button onClick={() => initiateSetup(activeTopic, 'quiz')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm">
              <RotateCcw size={18} /> Retake Quiz
            </button>
            <button onClick={goHome} className="px-5 py-2.5 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition hover:bg-gray-300 dark:hover:bg-gray-600">
              Back to Topics
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
           <h3 className="font-bold text-gray-900 dark:text-white text-xl">Review Answers</h3>
           <button 
              onClick={() => setFilterWrong(!filterWrong)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterWrong ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
           >
              <Filter size={16} /> {filterWrong ? 'Show All Answered' : 'Review Wrong Answers Only'}
           </button>
        </div>

        <div className="space-y-8">
          {sessionQuestions.map((q, idx) => {
            const userAnswer = userAnswers[idx];
            const isUnanswered = userAnswer === undefined;
            const isCorrect = userAnswer === q.correctAnswerIndex;

            // Filter out unanswered questions (for early exit summary bounds)
            if (isUnanswered) return null;
            // Filter wrong answers
            if (filterWrong && isCorrect) return null;

            return (
              <div key={q.id || idx} className={`p-6 rounded-xl border-l-4 shadow-sm bg-white dark:bg-gray-800 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                <div className="flex items-start gap-3">
                  {isCorrect ? <CheckCircle className="text-green-500 mt-1 shrink-0" /> : <XCircle className="text-red-500 mt-1 shrink-0" />}
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Question {idx + 1}</span>
                    <p className="text-gray-900 dark:text-white whitespace-pre-line font-medium mb-4">{q.question}</p>
                    
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, optIdx) => {
                        let rowClass = "p-3 rounded-lg border dark:border-gray-700 text-sm text-gray-800 dark:text-gray-300";
                        if (optIdx === q.correctAnswerIndex) {
                          rowClass = "p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100 font-medium";
                        } else if (optIdx === userAnswer && !isCorrect) {
                           rowClass = "p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100";
                        }
                        return (
                          <div key={optIdx} className={rowClass}>
                            {opt}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">Explanation:</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const EditView = () => {
    const [localTopic, setLocalTopic] = useState({...activeTopic});
    const [jsonInput, setJsonInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleTitleChange = (e) => {
      setLocalTopic({...localTopic, title: e.target.value});
    };

    const handleQuestionChange = (qIndex, field, value) => {
      const updatedQuestions = [...localTopic.questions];
      updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], [field]: value };
      setLocalTopic({...localTopic, questions: updatedQuestions});
    };

    const handleOptionChange = (qIndex, optIndex, value) => {
      const updatedQuestions = [...localTopic.questions];
      const updatedOptions = [...updatedQuestions[qIndex].options];
      updatedOptions[optIndex] = value;
      updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], options: updatedOptions };
      setLocalTopic({...localTopic, questions: updatedQuestions});
    };

    const addNewQuestion = () => {
      const newQ = {
        id: `q${Date.now()}`,
        type: 'theory',
        question: "New Question...",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswerIndex: 0,
        explanation: "Provide explanation here..."
      };
      setLocalTopic({...localTopic, questions: [...localTopic.questions, newQ]});
    };

    const deleteQuestion = (index) => {
      const updatedQuestions = localTopic.questions.filter((_, i) => i !== index);
      setLocalTopic({...localTopic, questions: updatedQuestions});
    };

    // Save to Cloud Firestore
    const saveChanges = async (topicData = localTopic) => {
      if (!user) {
        alert("Authentication required to save to cloud.");
        return;
      }
      setIsSaving(true);
      try {
        const topicRef = doc(db, 'artifacts', appId, 'public', 'data', 'quiz_topics', topicData.id);
        await setDoc(topicRef, topicData);
        setActiveTopic(topicData); 
        alert("Changes Saved to Cloud Successfully!");
        goHome();
      } catch (error) {
        console.error("Error saving document: ", error);
        alert("Failed to save to cloud! Check your Firestore Security Rules.");
      } finally {
        setIsSaving(false);
      }
    };

    // Auto-Save Import Logic
    const handleImportJson = async () => {
      try {
        const parsedData = JSON.parse(jsonInput);
        if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData[0].question) {
          const updatedTopic = {...localTopic, questions: [...localTopic.questions, ...parsedData]};
          setLocalTopic(updatedTopic);
          setJsonInput('');
          
          // Auto-trigger cloud save upon import
          await saveChanges(updatedTopic);
          
        } else {
           alert("Invalid JSON format. Expected an array of question objects.");
        }
      } catch (e) {
        alert("Error parsing JSON. Please check syntax.");
      }
    };

    return (
      <div className="max-w-5xl mx-auto p-6 animate-fade-in pb-24">
         <div className="flex justify-between items-center mb-6">
          <button onClick={goHome} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition font-medium">← Back</button>
          <div className="flex gap-4">
             <button onClick={() => saveChanges(localTopic)} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50 shadow-sm">
              <Cloud size={18} /> {isSaving ? 'Saving...' : 'Save to Cloud'}
            </button>
          </div>
        </div>

        <div className="mb-6">
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic Title</label>
           <input 
              type="text"
              value={localTopic.title}
              onChange={handleTitleChange}
              className="w-full text-2xl font-bold p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
           />
        </div>

        {/* JSON Import Tool */}
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 mb-8 shadow-sm">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Upload size={18} /> Batch Import & Auto-Save
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Paste your AI-generated JSON array here. Clicking load will instantly import and sync it to the cloud.</p>
            <textarea 
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[ { "question": "...", "options": [...], ... } ]'
              className="w-full h-32 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button onClick={handleImportJson} disabled={isSaving} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition shadow-sm">
              {isSaving ? 'Syncing to Cloud...' : 'Load JSON & Sync'}
            </button>
        </div>

        <div className="space-y-8">
          {localTopic.questions.map((q, qIndex) => (
            <div key={q.id || qIndex} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
               <button 
                  onClick={() => deleteQuestion(qIndex)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
                  title="Delete Question"
                >
                  <Trash2 size={20} />
                </button>
                
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Question {qIndex + 1}</h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Text</label>
                  <textarea 
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[100px] focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Option {optIndex + 1}</label>
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                        className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${q.correctAnswerIndex === optIndex ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-300 dark:border-gray-600'}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Answer</label>
                   <select 
                      value={q.correctAnswerIndex}
                      onChange={(e) => handleQuestionChange(qIndex, 'correctAnswerIndex', parseInt(e.target.value))}
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                   >
                     {q.options.map((_, i) => <option key={i} value={i}>Option {i + 1}</option>)}
                   </select>
                </div>

                 <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation</label>
                  <textarea 
                    value={q.explanation}
                    onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[80px] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
            </div>
          ))}
        </div>

        <button 
          onClick={addNewQuestion}
          className="mt-8 w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
        >
          <Plus size={20} /> Add New Question
        </button>
      </div>
    );
  };

  const FlashcardsView = () => {
    const [isFlipped, setIsFlipped] = useState(false);
    const question = sessionQuestions[currentQuestionIndex];

    const handleNext = () => {
      setIsFlipped(false);
      setCurrentQuestionIndex(prev => prev + 1);
    }
    const handlePrev = () => {
      setIsFlipped(false);
      setCurrentQuestionIndex(prev => prev - 1);
    }

    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in flex flex-col items-center justify-center min-h-[80vh]">
         <div className="w-full flex justify-between items-center mb-8">
          <button onClick={goHome} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition font-medium">← Back</button>
          <span className="text-gray-600 dark:text-gray-400 font-medium">Card {currentQuestionIndex + 1} of {sessionQuestions.length}</span>
         </div>

         <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full min-h-[400px] cursor-pointer perspective-1000 mb-8"
         >
            <div className={`relative w-full h-full min-h-[400px] transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
               {/* Front */}
               <div className="absolute w-full h-full backface-hidden flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-4">Question</span>
                  <p className="text-xl text-gray-900 dark:text-white font-medium whitespace-pre-line">{question.question}</p>
                  <p className="text-sm text-gray-400 mt-8">(Click to flip)</p>
               </div>
               {/* Back */}
               <div className="absolute w-full h-full backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 bg-blue-50 dark:bg-gray-800 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-600 text-center overflow-y-auto">
                   <span className="text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-4">Answer</span>
                   <p className="text-xl text-gray-900 dark:text-white font-bold mb-6">
                     {question.options[question.correctAnswerIndex]}
                   </p>
                   <div className="h-px w-full bg-blue-200 dark:bg-gray-600 mb-6 shrink-0"></div>
                   <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Explanation</span>
                   <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{question.explanation}</p>
               </div>
            </div>
         </div>

         <div className="flex gap-4">
            <button 
              disabled={currentQuestionIndex === 0}
              onClick={handlePrev}
              className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Previous
            </button>
            <button 
              disabled={currentQuestionIndex === sessionQuestions.length - 1}
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
      </div>
    )
  }

  // --- MAIN RENDER ---
  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
      
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'quiz' && <Quizzer />}
      {currentView === 'review' && <ReviewView />}
      {currentView === 'edit' && <EditView />}
      {currentView === 'flashcards' && <FlashcardsView />}
    </div>
  );
}