import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dark, setDark] = useState(false);

  // 🔐 Auth tracking
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // 📥 Fetch tasks
  useEffect(() => {
    if (user) fetchTasks(user);
  }, [user]);

  const fetchTasks = async (currentUser) => {
    try {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(list);
    } catch (err) {
      console.log(err);
    }
  };

  // ➕ Add Task
  const addTask = async () => {
    if (!title.trim()) return;
    await addDoc(collection(db, "tasks"), {
      title: title.trim(),
      status: "pending",
      userId: user.uid,
      createdAt: new Date(),
    });
    setTitle("");
    fetchTasks(user);
  };

  // ❌ Delete
  const deleteTask = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
    fetchTasks(user);
  };

  // ✅ Toggle
  const toggleTask = async (task) => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: task.status === "pending" ? "completed" : "pending",
    });
    fetchTasks(user);
  };

  // 🚪 Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // 📊 Stats
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;

  // Chart data
  const chartData = {
    labels: ["Completed", "Pending"],
    datasets: [
      {
        data: [completed, pending],
        backgroundColor: ["#10b981", "#f59e0b"],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  // 🔍 Filter logic
  const filteredTasks = tasks
    .filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
    .filter((task) => {
      if (filter === "all") return true;
      return task.status === filter;
    });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${dark ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`rounded-2xl shadow-xl p-6 mb-6 ${dark ? "bg-gray-800" : "bg-white/80 backdrop-blur-sm"}`}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <motion.h1
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
              >
                Task Dashboard
              </motion.h1>
              <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                Welcome back, {user?.email}
              </p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDark(!dark)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${dark ? "bg-yellow-500 text-gray-900" : "bg-gray-800 text-white"}`}
              >
                {dark ? "☀️ Light" : "🌙 Dark"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
              >
                🚪 Logout
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Task Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Task */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`rounded-2xl shadow-xl p-6 ${dark ? "bg-gray-800" : "bg-white/80 backdrop-blur-sm"}`}
            >
              <h2 className={`text-xl font-bold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>
                Add New Task
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  placeholder="Enter your task..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTask()}
                  className={`flex-1 p-3 rounded-lg border-2 focus:outline-none transition-all ${dark ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500" : "border-gray-200 focus:border-blue-500"}`}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addTask}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  + Add Task
                </motion.button>
              </div>
            </motion.div>

            {/* Search & Filter */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`rounded-2xl shadow-xl p-6 ${dark ? "bg-gray-800" : "bg-white/80 backdrop-blur-sm"}`}
            >
              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full p-3 rounded-lg border-2 mb-4 focus:outline-none transition-all ${dark ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500" : "border-gray-200 focus:border-blue-500"}`}
              />
              <div className="flex flex-wrap gap-3">
                {["all", "pending", "completed"].map((filterType) => (
                  <motion.button
                    key={filterType}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilter(filterType)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${filter === filterType
                        ? "bg-blue-600 text-white shadow-lg"
                        : dark
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    {filterType}
                    {filterType === "all" && ` (${tasks.length})`}
                    {filterType === "completed" && ` (${completed})`}
                    {filterType === "pending" && ` (${pending})`}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Tasks List */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={`rounded-2xl shadow-xl p-6 ${dark ? "bg-gray-800" : "bg-white/80 backdrop-blur-sm"}`}
            >
              <h2 className={`text-xl font-bold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>
                Your Tasks ({filteredTasks.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {filteredTasks.length === 0 ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-center py-8 ${dark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {search ? "No matching tasks found" : "No tasks yet. Add one above!"}
                    </motion.p>
                  ) : (
                    filteredTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -100 }}
                        whileHover={{ scale: 1.02 }}
                        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-lg transition-all ${dark ? "bg-gray-700 hover:bg-gray-650" : "bg-gray-50 hover:bg-gray-100"
                          }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleTask(task)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === "completed"
                                ? "bg-green-500 border-green-500"
                                : "border-gray-400 hover:border-green-500"
                              }`}
                          >
                            {task.status === "completed" && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-white text-sm"
                              >
                                ✓
                              </motion.span>
                            )}
                          </motion.button>
                          <span
                            className={`flex-1 text-sm md:text-base ${task.status === "completed"
                                ? "line-through opacity-60"
                                : ""
                              } ${dark ? "text-white" : "text-gray-800"}`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <span className={`text-xs px-2 py-1 rounded-full ${task.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                            }`}>
                            {task.status}
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => deleteTask(task.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm"
                          >
                            Delete
                          </motion.button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Statistics */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className={`rounded-2xl shadow-xl p-6 ${dark ? "bg-gray-800" : "bg-white/80 backdrop-blur-sm"}`}>
              <h2 className={`text-xl font-bold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>
                Statistics
              </h2>
              <div className="space-y-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-lg ${dark ? "bg-gray-700" : "bg-gradient-to-r from-green-50 to-emerald-50"}`}
                >
                  <p className="text-sm text-gray-500">Completed Tasks</p>
                  <p className="text-3xl font-bold text-green-600">{completed}</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-lg ${dark ? "bg-gray-700" : "bg-gradient-to-r from-yellow-50 to-amber-50"}`}
                >
                  <p className="text-sm text-gray-500">Pending Tasks</p>
                  <p className="text-3xl font-bold text-yellow-600">{pending}</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-lg ${dark ? "bg-gray-700" : "bg-gradient-to-r from-blue-50 to-indigo-50"}`}
                >
                  <p className="text-sm text-gray-500">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-600">{tasks.length}</p>
                </motion.div>
              </div>
            </div>

            {/* Pie Chart */}
            {(completed > 0 || pending > 0) && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={`rounded-2xl shadow-xl p-6 ${dark ? "bg-gray-800" : "bg-white/80 backdrop-blur-sm"}`}
              >
                <h2 className={`text-xl font-bold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>
                  Progress Chart
                </h2>
                <div className="w-full max-w-xs mx-auto">
                  <Pie data={chartData} options={chartOptions} />
                </div>
              </motion.div>
            )}

            {/* Progress Bar */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className={`rounded-2xl shadow-xl p-6 ${dark ? "bg-gray-800" : "bg-white/80 backdrop-blur-sm"}`}
            >
              <h2 className={`text-xl font-bold mb-4 ${dark ? "text-white" : "text-gray-800"}`}>
                Overall Progress
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span className="font-bold">
                    {tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tasks.length === 0 ? 0 : (completed / tasks.length) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
