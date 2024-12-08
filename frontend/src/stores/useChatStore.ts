import { axiosInstance } from "@/lib/axios";
import { Message, User } from "@/types";
import { create } from "zustand";
import { io } from "socket.io-client";

interface ChatStore {
	users: User[];
	isLoading: boolean;
	error: string | null;
	socket: any;
	isConnected: boolean;
	onlineUsers: Set<string>;
	userActivities: Map<string, string>;
	messages: Message[];
	selectedUser: User | null;

	fetchUsers: () => Promise<void>;
	initSocket: (userId: string) => void;
	disconnectSocket: () => void;
	sendMessage: (receiverId: string, senderId: string, content: string) => void;
	fetchMessages: (userId: string) => Promise<void>;
	setSelectedUser: (user: User | null) => void;
}

const baseURL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

const socket = io(baseURL, {
	autoConnect: false, // only connect if user is authenticated
	withCredentials: true,
});

export const useChatStore = create<ChatStore>((set, get) => ({
	users: [],
	isLoading: false,
	error: null,
	socket: socket,
	isConnected: false,
	onlineUsers: new Set(), //set() is a state updater function provided by Zustand.
	userActivities: new Map(),
	messages: [],
	selectedUser: null,

	setSelectedUser: (user) => set({ selectedUser: user }),

	fetchUsers: async () => {
		set({ isLoading: true, error: null });
		try {
			const response = await axiosInstance.get("/users");
			set({ users: response.data });
		} catch (error: any) {
			set({ error: error.response.data.message });
		} finally {
			set({ isLoading: false });
		}
	},

	initSocket: (userId) => {
		if (!get().isConnected) {
			// !get().isConnected : Ensures the socket is initialized only if it's not already connected, preventing duplicate connections.

			socket.auth = { userId };
			socket.connect();
			// socket.connect(): Establishes the WebSocket connection to the server.

			socket.emit("user_connected", userId);
			// Sends the user_connected event to the server, notifying it that the user is online

			socket.on("users_online", (users: string[]) => {
				set({ onlineUsers: new Set(users) });
			});
			// socket.on("users_online", ...): Listens for the users_online event from the server, which provides a list of currently online users.
			// set({ onlineUsers: new Set(users) }): Updates the Zustand store with the list of online users, converting it to a Set to ensure uniqueness.

			socket.on("activities", (activities: [string, string][]) => {
				set({ userActivities: new Map(activities) });
			});
			// socket.on("activities", ...): Listens for the activities event from the server, which provides a list of user activities as key-value pairs.
			// new Map(activities): Converts the array of key-value pairs into a Map object, which is ideal for representing user activities.

			socket.on("user_connected", (userId: string) => {
				set((state) => ({
					onlineUsers: new Set([...state.onlineUsers, userId]),
				}));
			});
			// socket.on("user_connected", ...): Listens for the user_connected event from the server, which indicates that a new user has come online.
			// set((state) => ... ): Updates the Zustand store: state.onlineUsers: The current set of online users. new Set([...state.onlineUsers, userId]): Adds the new user's ID to the set of online users.

			socket.on("user_disconnected", (userId: string) => {
				set((state) => {
					const newOnlineUsers = new Set(state.onlineUsers);
					newOnlineUsers.delete(userId);
					return { onlineUsers: newOnlineUsers };
				});
			});
			// socket.on("user_disconnected", ...): Listens for the user_disconnected event from the server, indicating a user has gone offline.
			// newOnlineUsers.delete(userId): Removes the disconnected user's ID from the Set. set(...): Updates the Zustand store with the new list of online users.


			socket.on("receive_message", (message: Message) => {
				set((state) => ({
					messages: [...state.messages, message],
				}));
			});
			// socket.on("receive_message", ...): Listens for new messages sent by other users.
			// [...state.messages, message]: Appends the new message to the existing list of messages. set(...): Updates the Zustand store with the updated list of messages.


			socket.on("message_sent", (message: Message) => {
				set((state) => ({
					messages: [...state.messages, message],
				}));
			});
			// socket.on("message_sent", ...): Listens for messages sent by the current user.
			// [...state.messages, message]: Appends the new message to the existing list of messages. set(...): Updates the Zustand store with the updated list of messages.


			socket.on("activity_updated", ({ userId, activity }) => {
				set((state) => {
					const newActivities = new Map(state.userActivities);
					newActivities.set(userId, activity);
					return { userActivities: newActivities };
				});
			});
			// socket.on("activity_updated", ...): Listens for activity updates from other users.
			// newActivities.set(userId, activity): Updates the user's activity in the Map. set(...): Updates the Zustand store with the updated user activities.

			set({ isConnected: true });
		}
	},


	disconnectSocket: () => {
		if (get().isConnected) {
			socket.disconnect();
			set({ isConnected: false });
		}
	},
	

	
	sendMessage: async (receiverId, senderId, content) => {
		const socket = get().socket;
		if (!socket) return;

		socket.emit("send_message", { receiverId, senderId, content });
	},

	
	fetchMessages: async (userId: string) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axiosInstance.get(`/users/messages/${userId}`);
			set({ messages: response.data });
		} catch (error: any) {
			set({ error: error.response.data.message });
		} finally {
			set({ isLoading: false });
		}
	},
}));



