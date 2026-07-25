import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  accessToken: "",
  refreshToken: "",
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.name = action.payload.name;
      state.userId = action.payload.userId;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearUser: () => {
      return initialState;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;

export const userSelectors = {
  selectUser: (state) => state.user,
};

export default userSlice.reducer;