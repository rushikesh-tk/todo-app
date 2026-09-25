import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchTodos, addTodo, updateTodo, deleteTodo } from "./todosSlice";
import { logoutUser } from "../auth/authSlice";

const TodosPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { todos, loading, error } = useSelector((state) => state.todos);
  const { user } = useSelector((state) => state.auth);

  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState("medium");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all"); // 'all', 'active', 'completed'
  const [activePriorityFilter, setActivePriorityFilter] = useState("all"); // 'all', 'low', 'medium', 'high'

  useEffect(() => {
    if (user) {
      dispatch(fetchTodos());
    }
  }, [dispatch, user]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (newTodoTitle.trim()) {
      await dispatch(
        addTodo({ title: newTodoTitle, priority: newTodoPriority }),
      );
      setNewTodoTitle("");
    }
  };

  const handleToggleComplete = (todo) => {
    dispatch(updateTodo({ id: todo.id, is_completed: !todo.is_completed }));
  };

  const handleDeleteTodo = (id) => {
    dispatch(deleteTodo(id));
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/auth");
  };

  // Filter and sort todos
  const filteredTodos = todos
    .filter((todo) => {
      // Filter by status
      if (activeStatusFilter === "active") return !todo.is_completed;
      if (activeStatusFilter === "completed") return todo.is_completed;
      return true;
    })
    .filter((todo) => {
      // Filter by priority
      if (activePriorityFilter === "all") return true;
      return todo.priority === activePriorityFilter;
    })
    .sort((a, b) => {
      // Sort by priority: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

  // Group todos by priority
  const groupedTodos = filteredTodos.reduce((acc, todo) => {
    (acc[todo.priority] = acc[todo.priority] || []).push(todo);
    return acc;
  }, {});

  const priorities = ["high", "medium", "low"];

  // Calculate stats
  const totalTodos = todos.length;
  const completedTodos = todos.filter((todo) => todo.is_completed).length;
  const highPriorityTodos = todos.filter(
    (todo) => todo.priority === "high",
  ).length;
  const remainingTodos = totalTodos - completedTodos;
  const completionPercentage =
    totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // Start rendering JSX. This will be an empty shell initially.
  return (
    <div className="min-h-screen bg-[#0F1729] text-white flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1A2540] border-r border-gray-700 p-6 space-y-8">
        {/* Logo */}
        <div className="text-2xl font-bold font-sora bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
          Taskflow{" "}
          <span className="block text-sm text-gray-400 font-inter font-normal mt-1">
            Manage your tasks
          </span>
        </div>
        {/* User Card */}
        {user && (
          <div className="bg-[#222E4A] rounded-xl p-4 flex items-center space-x-3 border border-gray-700">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {user.email ? user.email[0].toUpperCase() : "U"}
            </div>
            <div>
              <div className="text-sm font-medium">{user.email}</div>
              <div className="text-xs text-gray-400">User</div>
            </div>
          </div>
        )}
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#222E4A] rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Total Tasks</div>
            <div className="text-2xl font-bold font-sora text-indigo-400">
              {totalTodos}
            </div>
          </div>
          <div className="bg-[#222E4A] rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Completed</div>
            <div className="text-2xl font-bold font-sora text-green-400">
              {completedTodos}
            </div>
          </div>
          <div className="bg-[#222E4A] rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">High Priority</div>
            <div className="text-2xl font-bold font-sora text-red-400">
              {highPriorityTodos}
            </div>
          </div>
          <div className="bg-[#222E4A] rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Remaining</div>
            <div className="text-2xl font-bold font-sora">{remainingTodos}</div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Completion</span>
            <span>{completionPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="flex-grow"></div> {/* Spacer */}
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 flex flex-col p-6">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-sora">My Todos</h1>
          <div className="text-gray-400 text-sm">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="flex gap-4 mb-8">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-[#222E4A] border border-gray-700 rounded-lg p-3 text-white focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <select
            value={newTodoPriority}
            onChange={(e) => setNewTodoPriority(e.target.value)}
            className="bg-[#222E4A] border border-gray-700 rounded-lg p-3 text-white focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Add
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex rounded-lg bg-[#1A2540] border border-gray-700">
            {["all", "active", "completed"].map((filter) => (
              <button
                key={filter}
                className={`py-2 px-4 text-sm font-medium rounded-lg transition-colors duration-200 \
                  ${activeStatusFilter === filter ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-gray-200"}\
                `}
                onClick={() => setActiveStatusFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-[#1A2540] border border-gray-700">
            {["all", "low", "medium", "high"].map((filter) => (
              <button
                key={filter}
                className={`py-2 px-4 text-sm font-medium rounded-lg transition-colors duration-200 \
                  ${activePriorityFilter === filter ? "bg-purple-500 text-white" : "text-gray-400 hover:text-gray-200"}\
                `}
                onClick={() => setActivePriorityFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading/Error State */}
        {loading && <p className="text-indigo-400">Loading todos...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}

        {/* Todo List */}
        {!loading && !error && filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-400 py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <p className="text-xl font-semibold mb-2">No tasks here!</p>
            <p className="text-sm">Add a new task or adjust your filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {priorities.map(
              (priority) =>
                groupedTodos[priority] &&
                groupedTodos[priority].length > 0 && (
                  <div key={priority}>
                    <h2 className="text-lg font-semibold mb-3 capitalize text-gray-300">
                      {priority} Priority ({groupedTodos[priority].length})
                    </h2>
                    <div className="space-y-4">
                      {groupedTodos[priority].map((todo) => (
                        <div
                          key={todo.id}
                          className="bg-[#1A2540] rounded-lg shadow-md p-4 flex items-center justify-between border border-gray-700 group relative overflow-hidden"
                        >
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-2 \
                          ${todo.priority === "high" ? "bg-red-500" : ""}\
                          ${todo.priority === "medium" ? "bg-yellow-500" : ""}\
                          ${todo.priority === "low" ? "bg-green-500" : ""}\
                        `}
                          ></div>
                          <div className="flex items-center flex-1 ml-4">
                            {" "}
                            {/* Added ml-4 for stripe offset */}
                            <input
                              type="checkbox"
                              checked={todo.is_completed}
                              onChange={() => handleToggleComplete(todo)}
                              className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <span
                              className={`ml-3 text-lg ${todo.is_completed ? "line-through text-gray-500" : "text-gray-100"}`}
                            >
                              {todo.title}
                            </span>
                            <span
                              className={`ml-3 px-2 py-0.5 rounded-full text-xs font-semibold \
                            ${todo.priority === "high" ? "bg-red-500/20 text-red-400" : ""}\
                            ${todo.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : ""}\
                            ${todo.priority === "low" ? "bg-green-500/20 text-green-400" : ""}\
                          `}
                            >
                              {todo.priority}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2"
                            title="Delete Todo"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TodosPage;
