import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { errorMessage } from '../app/api';

const savedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
})();

export const authenticate = createAsyncThunk(
  'auth/authenticate',
  async ({ mode, ...form }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/auth/${mode}`, form); // mode = 'login' | 'register'
      return data;
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: savedUser,
    token: localStorage.getItem('token'),
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(authenticate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(authenticate.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(authenticate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
