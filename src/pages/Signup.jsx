import { useState } from "react";
import { motion } from "framer-motion";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await sendEmailVerification(userCred.user);
      alert(
        "Verification email sent! Please verify your email before logging in."
      );
      navigate("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak");
      } else {
        setError("Signup failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-100 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <motion.form
          onSubmit={handleSignup}
          className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl"
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <motion.h2
            animate={{ x: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent"
          >
            Create Account
          </motion.h2>
          <p className="text-center text-gray-600 mb-6">Join us today!</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="email"
            placeholder="Email Address"
            className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4 focus:border-green-500 focus:outline-none transition-colors"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="password"
            placeholder="Password"
            className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4 focus:border-green-500 focus:outline-none transition-colors"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 border-2 border-gray-200 rounded-lg mb-6 focus:border-green-500 focus:outline-none transition-colors"
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white p-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Sign Up
          </motion.button>

          <motion.p
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate("/")}
            className="text-sm text-center mt-4 cursor-pointer text-gray-600"
          >
            Already have an account?{" "}
            <span className="text-green-600 font-semibold">Login</span>
          </motion.p>
        </motion.form>
      </motion.div>
    </div>
  );
}

export default Signup;