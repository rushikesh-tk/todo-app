# ADR-004: Frontend State Strategy — Redux Boundaries

## Status
Accepted

## Date
2026-06-24

## Context

The frontend uses React + Redux Toolkit. Not everything belongs in Redux.
Putting too much in Redux creates unnecessary complexity.
Putting too little means components can't share state.

This ADR defines exactly what lives in Redux and what stays local,
and explains the async pattern used for every backend call.

---

## The Rule for Deciding Where State Lives

Ask one question:

  "Does more than one component need to read this piece of state?"

  YES → Redux
  NO  → local component state (useState)

A second question for async state specifically:

  "Does this state change because of a backend call?"

  YES → Redux (loading, error, and the data all go together in one slice)
  NO  → local state is fine

---

## What Lives in Redux

### Auth Slice (features/auth/authSlice.js)

```javascript
initialState: {
    user: null,              // { id, email } — set on login, cleared on logout
    isAuthenticated: false,  // true when user is logged in
    loading: false,          // true while login/register request is in flight
    error: null              // "Invalid credentials" etc, null when fine
}
```

Why Redux:
- Navbar needs to know if user is logged in (show logout button)
- ProtectedRoute needs to know if user is logged in (redirect to /auth if not)
- TodosPage needs the user id to fetch the right todos
- Multiple components read auth state → Redux

### Todos Slice (features/todos/todosSlice.js)

```javascript
initialState: {
    todos: [],       // array of todo objects from the backend
    loading: false,  // true while any backend call is in flight
    error: null      // null when fine, error message string when not
}
```

Why Redux:
- TodosPage renders the list
- Navbar could show a count of incomplete todos
- Any future component can read todos without prop drilling
- Every todo operation (fetch, add, update, delete) is async → needs loading/error

---

## What Lives in Local State

### Form input values

```javascript
// Inside TodosPage.jsx
const [newTodoTitle, setNewTodoTitle] = useState('')
const [priority, setPriority] = useState('medium')
```

Why local:
- Only the input component needs to know what the user is typing
- When the form is submitted or cleared, the value resets
- No other component cares what is currently in the input box

### Edit mode toggle per todo

```javascript
// Inside a TodoItem component
const [isEditing, setIsEditing] = useState(false)
const [editTitle, setEditTitle] = useState(todo.title)
```

Why local:
- Only that specific todo row needs to know if it is being edited
- When the user cancels or saves, the edit mode resets
- Putting every todo's edit state in Redux would be unnecessary complexity

---

## The Async Thunk Pattern

Every backend call follows the same three-state pattern:

```
loading: true   → request started (show spinner)
loading: false  → request finished
  + success:    update the data, clear error
  + failure:    set error message, data unchanged
```

This is implemented using `createAsyncThunk` from Redux Toolkit.

### Example: Fetch all todos

```javascript
// features/todos/todosSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// The async thunk — makes the backend call
export const fetchTodos = createAsyncThunk(
    'todos/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/todos')
            return response.data          // goes to fulfilled case
        } catch (error) {
            return rejectWithValue(error.response.data.detail)  // goes to rejected case
        }
    }
)

// The slice — handles the three states
const todosSlice = createSlice({
    name: 'todos',
    initialState: { todos: [], loading: false, error: null },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTodos.pending, (state) => {
                state.loading = true
                state.error = null        // clear previous error
            })
            .addCase(fetchTodos.fulfilled, (state, action) => {
                state.loading = false
                state.todos = action.payload   // replace with fresh data
            })
            .addCase(fetchTodos.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload   // show error message
            })
    }
})
```

### The same pattern applies to every operation

| Operation     | Thunk name      | On success                          |
|---------------|-----------------|-------------------------------------|
| Fetch todos   | fetchTodos      | todos = response data               |
| Add todo      | addTodo         | todos = [...todos, new todo]        |
| Update todo   | updateTodo      | replace the matching todo in array  |
| Delete todo   | deleteTodo      | remove the matching todo from array |
| Login         | loginUser       | user = response data, isAuthenticated = true |
| Register      | registerUser    | redirect to login                   |
| Logout        | logoutUser      | user = null, isAuthenticated = false |

---

## How a Component Uses This

```javascript
// features/todos/TodosPage.jsx

import { useSelector, useDispatch } from 'react-redux'
import { fetchTodos, addTodo } from './todosSlice'
import { useState, useEffect } from 'react'

function TodosPage() {
    // Redux state
    const { todos, loading, error } = useSelector(state => state.todos)
    const dispatch = useDispatch()

    // Local state — only this component cares about this
    const [newTitle, setNewTitle] = useState('')
    const [priority, setPriority] = useState('medium')

    // Fetch todos when page loads
    useEffect(() => {
        dispatch(fetchTodos())
    }, [dispatch])

    // Handle add todo form submit
    const handleAdd = () => {
        if (!newTitle.trim()) return
        dispatch(addTodo({ title: newTitle, priority }))
        setNewTitle('')           // clear the input after submit
        setPriority('medium')     // reset priority after submit
    }

    if (loading) return <p>Loading...</p>
    if (error) return <p>Error: {error}</p>

    return (
        // render todos list and form
    )
}
```

Key things to notice:
- `useSelector` reads from Redux (todos, loading, error)
- `useDispatch` + `dispatch(thunk)` triggers a backend call
- `newTitle` and `priority` are local — they never touch Redux
- After submit, local state is cleared but Redux todos updates

---

## Axios Instance (services/api.js)

All backend calls go through one Axios instance.
Never import axios directly in a component or slice.

```javascript
// services/api.js
import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,  // http://localhost:8000
    withCredentials: true,                   // sends httpOnly cookie
})

export default api
```

Rule: every thunk imports `api` from `services/api.js`.
No direct `axios.get(...)` anywhere else in the codebase.

---

## Redux Store Setup

```javascript
// app/store.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import todosReducer from '../features/todos/todosSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        todos: todosReducer,
    }
})
```

```javascript
// main.jsx
import { Provider } from 'react-redux'
import { store } from './app/store'

ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
        <App />
    </Provider>
)
```

The Provider wraps the entire app so every component can access Redux.

---

## When to Revisit

Revisit this ADR if:
- A third feature is added that needs its own slice (e.g. categories)
- A component needs state that is shared but not async
  (consider Redux or React Context depending on complexity)

---

## Consequences

Positive:
- Clear rule for every state decision: shared/async → Redux, local → useState
- loading and error always travel with the data in the same slice
- One Axios instance means withCredentials is never accidentally missing
- The async thunk pattern is consistent across all operations

Negative:
- More boilerplate than plain useState for simple operations
- createAsyncThunk takes time to understand the first time
- Every new backend operation needs a thunk + three extraReducer cases
