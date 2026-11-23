import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { errorMessage } from '../app/api';

export const fetchIssues = createAsyncThunk('issues/fetchAll', async (filters = {}, { rejectWithValue }) => {
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await api.get('/issues', { params });
    return data;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const fetchStats = createAsyncThunk('issues/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/issues/stats');
    return data;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const fetchIssue = createAsyncThunk('issues/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/issues/${id}`);
    return data;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const updateIssue = createAsyncThunk('issues/update', async ({ id, changes }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/issues/${id}`, changes);
    return data;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const toggleVote = createAsyncThunk('issues/vote', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/issues/${id}/vote`);
    return { id, votes: data.votes };
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const deleteIssue = createAsyncThunk('issues/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/issues/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const fetchTeam = createAsyncThunk('issues/fetchTeam', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/users');
    return data;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

const issuesSlice = createSlice({
  name: 'issues',
  initialState: {
    list: [],
    current: null,
    stats: null,
    team: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrent(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.team = action.payload;
      })
      .addCase(fetchIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.current = null;
      })
      .addCase(fetchIssue.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateIssue.fulfilled, (state, action) => {
        state.current = action.payload;
        const i = state.list.findIndex((x) => x._id === action.payload._id);
        if (i !== -1) state.list[i] = { ...state.list[i], ...action.payload, screenshot: undefined };
      })
      .addCase(toggleVote.fulfilled, (state, action) => {
        const { id, votes } = action.payload;
        const apply = (issue) => {
          if (issue && issue._id === id) {
            issue.votes = votes;
            issue.voteCount = votes.length;
          }
        };
        state.list.forEach(apply);
        apply(state.current);
      })
      .addCase(deleteIssue.fulfilled, (state, action) => {
        state.list = state.list.filter((x) => x._id !== action.payload);
        state.current = null;
      });
  },
});

export const { clearCurrent } = issuesSlice.actions;
export default issuesSlice.reducer;
