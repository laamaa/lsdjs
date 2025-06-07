import {createSlice, PayloadAction} from '@reduxjs/toolkit';

// Define the UI state interface
interface UiState {
  activeTab: string;
  isModalOpen: boolean;
  modalContent: string | null;
  isMobileMenuOpen: boolean;
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
  }>;
}

// Define the initial state
const initialState: UiState = {
  activeTab: 'rom-info', // Default tab
  isModalOpen: false,
  modalContent: null,
  isMobileMenuOpen: false,
  notifications: [],
};

// Create the UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.isModalOpen = true;
      state.modalContent = action.payload;
    },
    closeModal: (state) => {
      state.isModalOpen = false;
      state.modalContent = null;
    },
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    closeMobileMenu: (state) => {
      state.isMobileMenuOpen = false;
    },
    addNotification: (state, action: PayloadAction<{ message: string; type: 'info' | 'success' | 'warning' | 'error' }>) => {
      const { message, type } = action.payload;
      const id = Date.now().toString();
      state.notifications.push({
        id,
        message,
        type,
        timestamp: Date.now(),
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
  },
});

// Export actions and reducer
export const {
  setActiveTab,
  openModal,
  closeModal,
  toggleMobileMenu,
  closeMobileMenu,
  addNotification,
  removeNotification,
  clearAllNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;