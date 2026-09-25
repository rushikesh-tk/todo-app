import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const initialState = {
  todos: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchTodos = createAsyncThunk(
  "todos/fetchTodos",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/todos/");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response.data.detail || "Failed to fetch todos",
      );
    }
  },
);

export const addTodo = createAsyncThunk(
  "todos/addTodo",
  async (todoData, { rejectWithValue }) => {
    try {
      const response = await api.post("/todos/", todoData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response.data.detail || "Failed to add todo",
      );
    }
  },
);

export const updateTodo = createAsyncThunk(
  "todos/updateTodo",
  async ({ id, ...todoData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/todos/${id}`, todoData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response.data.detail || "Failed to update todo",
      );
    }
  },
);

export const deleteTodo = createAsyncThunk(
  "todos/deleteTodo",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/todos/${id}`);
      return id; // Return the ID of the deleted todo
    } catch (error) {
      return rejectWithValue(
        error.response.data.detail || "Failed to delete todo",
      );
    }
  },
);

const todosSlice = createSlice({
  name: "todos",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Todos
      .addCase(fetchTodos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.loading = false;
        state.todos = action.payload;
        state.error = null;
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Todo
      .addCase(addTodo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTodo.fulfilled, (state, action) => {
        state.loading = false;
        state.todos.unshift(action.payload); // Add to start of array
        state.error = null;
      })
      .addCase(addTodo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Todo
      .addCase(updateTodo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTodo.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.todos.findIndex(
          (todo) => todo.id === action.payload.id,
        );
        if (index !== -1) {
          state.todos[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateTodo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Todo
      .addCase(deleteTodo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTodo.fulfilled, (state, action) => {
        state.loading = false;
        state.todos = state.todos.filter((todo) => todo.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteTodo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default todosSlice.reducer;
