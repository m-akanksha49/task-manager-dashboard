import { useEffect, useState, useCallback, useMemo } from "react";
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
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { Pie, Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from "chart.js";
import { format, subDays, startOfWeek, endOfWeek, isToday, isThisWeek, isThisMonth } from "date-fns";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

function Dashboard() {
  const navigate = useNavigate();
  
  // User State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  
  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("personal");
  
  // UI States
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [viewMode, setViewMode] = useState("list"); // list, grid, calendar
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);
  const [totalTasks, setTotalTasks] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    highPriority: 0,
    completionRate: 0,
  });

  // Apply theme
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // Auth tracking
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

  // Fetch tasks
  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  // Apply filters and sorting
  useEffect(() => {
    applyFiltersAndSort();
  }, [tasks, search, filter, priorityFilter, categoryFilter, dateFilter, sortBy, sortOrder]);

  const fetchTasks = async () => {
    try {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        dueDate: doc.data().dueDate?.toDate?.() || null,
      }));
      setTasks(list);
      calculateStats(list);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const calculateStats = (taskList) => {
    const now = new Date();
    const completed = taskList.filter(t => t.status === "completed").length;
    const pending = taskList.filter(t => t.status === "pending").length;
    const overdue = taskList.filter(t => 
      t.status === "pending" && 
      t.dueDate && 
      t.dueDate < now
    ).length;
    const highPriority = taskList.filter(t => t.priority === "high" && t.status === "pending").length;
    const completionRate = taskList.length === 0 ? 0 : (completed / taskList.length) * 100;

    setStats({
      total: taskList.length,
      completed,
      pending,
      overdue,
      highPriority,
      completionRate,
    });
    setTotalTasks(taskList.length);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...tasks];

    // Search filter
    if (search) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // Status filter
    if (filter !== "all") {
      filtered = filtered.filter(task => task.status === filter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Date filter
    const now = new Date();
    switch (dateFilter) {
      case "today":
        filtered = filtered.filter(task => task.dueDate && isToday(task.dueDate));
        break;
      case "week":
        filtered = filtered.filter(task => task.dueDate && isThisWeek(task.dueDate));
        break;
      case "month":
        filtered = filtered.filter(task => task.dueDate && isThisMonth(task.dueDate));
        break;
      case "overdue":
        filtered = filtered.filter(task => task.dueDate && task.dueDate < now && task.status === "pending");
        break;
      default:
        break;
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "title":
          aVal = a.title;
          bVal = b.title;
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority] || 0;
          bVal = priorityOrder[b.priority] || 0;
          break;
        case "dueDate":
          aVal = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
          bVal = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
          break;
        default:
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
      }
      if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    setFilteredTasks(filtered);
  };

  const addTask = async () => {
    if (!title.trim()) return;

    try {
      await addDoc(collection(db, "tasks"), {
        title: title.trim(),
        description: description.trim(),
        status: "pending",
        priority,
        category,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        userId: user.uid,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });
      
      resetForm();
      fetchTasks();
      showNotification("Task added successfully!", "success");
    } catch (err) {
      console.error("Error adding task:", err);
      showNotification("Failed to add task", "error");
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      });
      fetchTasks();
      showNotification("Task updated successfully!", "success");
      setShowModal(false);
    } catch (err) {
      console.error("Error updating task:", err);
      showNotification("Failed to update task", "error");
    }
  };

  const deleteTask = async (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteDoc(doc(db, "tasks", id));
        fetchTasks();
        showNotification("Task deleted successfully!", "success");
      } catch (err) {
        console.error("Error deleting task:", err);
        showNotification("Failed to delete task", "error");
      }
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === "pending" ? "completed" : "pending";
    await updateTask(task.id, { status: newStatus });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setCategory("personal");
  };

  const showNotification = (message, type) => {
    // You can implement a toast notification system here
    alert(message);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // Chart data for progress over time (last 7 days)
  const getLast7DaysData = useMemo(() => {
    const days = [];
    const completedTasks = [];
    const createdTasks = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      days.push(format(date, "EEE"));
      
      const completedCount = tasks.filter(task => 
        task.status === "completed" && 
        task.updatedAt && 
        format(new Date(task.updatedAt), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length;
      
      const createdCount = tasks.filter(task => 
        task.createdAt && 
        format(new Date(task.createdAt), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length;
      
      completedTasks.push(completedCount);
      createdTasks.push(createdCount);
    }
    
    return { days, completedTasks, createdTasks };
  }, [tasks]);

  const lineChartData = {
    labels: getLast7DaysData.days,
    datasets: [
      {
        label: "Tasks Created",
        data: getLast7DaysData.createdTasks,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Tasks Completed",
        data: getLast7DaysData.completedTasks,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const pieChartData = {
    labels: ["Completed", "Pending", "Overdue"],
    datasets: [
      {
        data: [stats.completed, stats.pending, stats.overdue],
        backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const priorityChartData = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        data: [
          tasks.filter(t => t.priority === "high" && t.status === "pending").length,
          tasks.filter(t => t.priority === "medium" && t.status === "pending").length,
          tasks.filter(t => t.priority === "low" && t.status === "pending").length,
        ],
        backgroundColor: ["#ef4444", "#f59e0b", "#10b981"],
        borderWidth: 0,
      },
    ],
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "work": return "💼";
      case "personal": return "👤";
      case "shopping": return "🛒";
      case "health": return "💪";
      default: return "📝";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "dark bg-gray-900" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center"
              >
                <span className="text-2xl">✅</span>
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  TaskFlow Pro
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome back, {user?.email?.split("@")[0]}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDark(!dark)}
                className="px-4 py-2 rounded-lg font-semibold transition-all bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:shadow-lg"
              >
                {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all hover:shadow-lg"
              >
                🚪 Logout
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total Tasks", value: stats.total, color: "blue", icon: "📋" },
            { label: "Completed", value: stats.completed, color: "green", icon: "✅" },
            { label: "Pending", value: stats.pending, color: "yellow", icon: "⏳" },
            { label: "Overdue", value: stats.overdue, color: "red", icon: "⚠️" },
            { label: "Completion Rate", value: `${Math.round(stats.completionRate)}%`, color: "purple", icon: "📊" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border-l-4 border-${stat.color}-500`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>
                    {stat.value}
                  </p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Task Analytics (Last 7 Days)</h2>
            <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: true }} />
          </motion.div>
          
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Task Distribution</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Status</h3>
                <Doughnut data={pieChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Priority (Pending)</h3>
                <Doughnut data={priorityChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Add Task Form */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
        >
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Create New Task</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Task title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="low">🟢 Low Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="high">🔴 High Priority</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="personal">👤 Personal</option>
              <option value="work">💼 Work</option>
              <option value="shopping">🛒 Shopping</option>
              <option value="health">💪 Health</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addTask}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            + Add Task
          </motion.button>
        </motion.div>

        {/* Filters & Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg transition-all ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                🔲 Grid
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Categories</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="shopping">Shopping</option>
              <option value="health">Health</option>
            </select>
            
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="overdue">Overdue</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="createdAt">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="priority">Sort by Priority</option>
              <option value="dueDate">Sort by Due Date</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>

        {/* Tasks Display */}
        {viewMode === "list" ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <AnimatePresence>
                    {filteredTasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage).map((task, idx) => (
                      <motion.tr
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleTaskStatus(task)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === "completed" ? "bg-green-500 border-green-500" : "border-gray-400 hover:border-green-500"}`}
                          >
                            {task.status === "completed" && <span className="text-white text-sm">✓</span>}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className={`font-medium ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{task.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)} text-white`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{getCategoryIcon(task.category)} {task.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm ${task.dueDate && task.dueDate < new Date() && task.status === "pending" ? "text-red-500 font-semibold" : "text-gray-600 dark:text-gray-400"}`}>
                            {task.dueDate ? format(new Date(task.dueDate), "MMM dd, yyyy") : "No date"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setShowModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredTasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === "completed" ? "bg-green-500 border-green-500" : "border-gray-400"}`}
                    >
                      {task.status === "completed" && <span className="text-white text-sm">✓</span>}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setSelectedTask(task);
                        setShowModal(true);
                      }} className="text-blue-600">✏️</button>
                      <button onClick={() => deleteTask(task.id)} className="text-red-600">🗑️</button>
                    </div>
                  </div>
                  
                  <h3 className={`font-semibold mb-2 ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                    {task.title}
                  </h3>
                  
                  {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)} text-white`}>
                      {task.priority}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700">
                      {getCategoryIcon(task.category)} {task.category}
                    </span>
                    {task.dueDate && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${task.dueDate < new Date() && task.status === "pending" ? "bg-red-100 text-red-700" : "bg-gray-200 dark:bg-gray-700"}`}>
                        📅 {format(new Date(task.dueDate), "MMM dd")}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {filteredTasks.length > tasksPerPage && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {Math.ceil(filteredTasks.length / tasksPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTasks.length / tasksPerPage), p + 1))}
              disabled={currentPage === Math.ceil(filteredTasks.length / tasksPerPage)}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}

        {/* Edit Task Modal */}
        {showModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Edit Task</h2>
              <input
                type="text"
                value={selectedTask.title}
                onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <textarea
                value={selectedTask.description || ""}
                onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="3"
                placeholder="Description"
              />
              <select
                value={selectedTask.priority}
                onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <select
                value={selectedTask.category}
                onChange={(e) => setSelectedTask({ ...selectedTask, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="personal">Personal</option>
                <option value="work">Work</option>
                <option value="shopping">Shopping</option>
                <option value="health">Health</option>
              </select>
              <input
                type="date"
                value={selectedTask.dueDate ? format(new Date(selectedTask.dueDate), "yyyy-MM-dd") : ""}
                onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value ? new Date(e.target.value) : null })}
                className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => updateTask(selectedTask.id, selectedTask)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white py-2 rounded-lg font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;