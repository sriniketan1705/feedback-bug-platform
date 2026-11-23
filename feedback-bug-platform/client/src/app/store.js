import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/authSlice';
import issuesReducer from '../features/issuesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    issues: issuesReducer,
  },
});
