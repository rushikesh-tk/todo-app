import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "./authSlice";

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState("login"); // 'login' or 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/todos");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setLocalError(error); // Keep local state in sync with Redux error
  }, [error]);

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setLocalError(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    clearForm(); // Clear form and errors when switching tabs
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null); // Clear previous errors on submit

    if (activeTab === "register") {
      const resultAction = await dispatch(registerUser({ email, password }));
      if (registerUser.fulfilled.match(resultAction)) {
        // On successful registration, switch to login tab and clear form
        handleTabChange("login");
      } else if (registerUser.rejected.match(resultAction)) {
        setLocalError(resultAction.payload);
      }
    } else {
      // activeTab === 'login'
      const resultAction = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(resultAction)) {
        // On successful login, navigate to /todos
        navigate("/todos");
      } else if (loginUser.rejected.match(resultAction)) {
        setLocalError(resultAction.payload);
      }
    }
  };

  const isFormValid = email && password && password.length >= 6; // Basic validation

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-8 space-y-6">
        <div className="flex justify-center border-b border-gray-700 dark:border-gray-800">
          <button
            className={`py-3 px-6 text-lg font-medium transition-colors duration-200 
              ${
                activeTab === "login"
                  ? "text-indigo-400 border-b-2 border-indigo-500"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            onClick={() => handleTabChange("login")}
          >
            Login
          </button>
          <button
            className={`py-3 px-6 text-lg font-medium transition-colors duration-200 
              ${
                activeTab === "register"
                  ? "text-indigo-400 border-b-2 border-indigo-500"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            onClick={() => handleTabChange("register")}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 dark:text-gray-400"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 bg-gray-700 dark:bg-gray-800 border border-gray-600 dark:border-gray-700 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 dark:text-gray-400"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 bg-gray-700 dark:bg-gray-800 border border-gray-600 dark:border-gray-700 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
              required
              minLength="6"
            />
          </div>

          {localError && <p className="text-red-400 text-sm">{localError}</p>}

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`w-full py-3 px-4 rounded-md text-white font-semibold 
              bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 
              dark:focus:ring-offset-gray-900 transition-all duration-200
              ${!isFormValid || loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading
              ? "Loading..."
              : activeTab === "login"
                ? "Login"
                : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
