import { configureStore } from "@reduxjs/toolkit";

// Placeholder for authReducer - will be implemented in features/auth/authSlice.js
// import authReducer from '../features/auth/authSlice';

// Placeholder for todosReducer - will be implemented in features/todos/todosSlice.js
// import todosReducer from '../features/todos/todosSlice';

export const store = configureStore({
  reducer: {
    // auth: authReducer,
    // todos: todosReducer,
  },
});
