import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (locked) {
      alert("Too many attempts. Try later.");
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      if (!userCred.user.emailVerified) {
        alert("Please verify your email first");
        return;
      }

      setAttempts(0);
      navigate("/dashboard");
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        setLocked(true);
        setTimeout(() => {
          setLocked(false);
          setAttempts(0);
        }, 30000);
      }

      alert("Invalid credentials");
    }
  };

  const handleReset = async () => {
    if (!email) {
      alert("Enter your email first");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
      setShowReset(false);
    } catch {
      alert("If an account exists, a reset email has been sent.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <motion.form
          onSubmit={handleLogin}
          className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.h2
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
          >
            Welcome Back
          </motion.h2>
          <p className="text-center text-gray-600 mb-6">Sign in to continue</p>

          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="email"
            placeholder="Email Address"
            className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4 focus:border-blue-500 focus:outline-none transition-colors"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="password"
            placeholder="Password"
            className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4 focus:border-blue-500 focus:outline-none transition-colors"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Login
          </motion.button>

          <motion.p
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowReset(!showReset)}
            className="text-sm text-blue-600 mt-3 cursor-pointer text-center"
          >
            Forgot Password?
          </motion.p>

          <motion.p
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate("/signup")}
            className="text-sm text-center mt-4 cursor-pointer text-gray-600"
          >
            Don't have an account?{" "}
            <span className="text-blue-600 font-semibold">Sign Up</span>
          </motion.p>

          <AnimatePresence>
            {showReset && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-blue-50 rounded-lg"
              >
                <p className="text-sm text-gray-600 mb-2">
                  Enter your email to reset password
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReset}
                  className="w-full bg-blue-500 text-white p-2 rounded-lg text-sm"
                >
                  Send Reset Email
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      </motion.div>
    </div>
  );
}

export default Login;