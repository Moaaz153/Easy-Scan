/**
 * Redux slice for authentication
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  signup,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  getStoredToken,
  getStoredRefreshToken,
  User,
  UserSignup,
  UserLogin,
  TokenResponse,
} from '@/services/authApi';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  loading: false,
  error: null,
  isAuthenticated: !!getStoredToken(),
};

// Async thunks
export const signupAsync = createAsyncThunk(
  'auth/signup',
  async (userData: UserSignup) => {
    const response = await signup(userData);
    return response;
  }
);

export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: UserLogin) => {
    const response = await login(credentials);
    return response;
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async () => {
    await logout();
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async () => {
    const response = await getCurrentUser();
    return response;
  }
);

export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshToken',
  async (refreshTokenValue: string) => {
    const response = await refreshToken(refreshTokenValue);
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addCase(signupAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupAsync.fulfilled, (state) => {
        state.loading = false;
        // Signup doesn't automatically log in
      })
      .addCase(signupAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to sign up';
      });

    // Login
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action: PayloadAction<TokenResponse>) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to log in';
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutAsync.rejected, (state) => {
        state.loading = false;
        // Even if API call fails, clear local state
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });

    // Fetch current user
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user';
        state.isAuthenticated = false;
        // Clear tokens if fetch fails
        state.token = null;
        state.refreshToken = null;
      });

    // Refresh token
    builder
      .addCase(refreshTokenAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshTokenAsync.fulfilled, (state, action: PayloadAction<TokenResponse>) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
      })
      .addCase(refreshTokenAsync.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
        state.user = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;

