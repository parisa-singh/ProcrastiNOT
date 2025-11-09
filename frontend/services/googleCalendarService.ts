/*
import type { CalendarEvent } from "../types";

// Make sure the Google API script is loaded in your index.html
declare const gapi: any;

const GOOGLE_API_KEY = "AIzaSyBN3nfW4lOFVcYbezahbQf2NJTB23reNps";
const GOOGLE_CLIENT_ID = "130585006173-jp9jqk6mfifg6e0vq6el50er4m4bb2c4.apps.googleusercontent.com";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

/**
 * Sign in with Google and fetch the next 7 days of calendar events.
 
export async function signInAndFetchEvents(): Promise<CalendarEvent[]> {
    
    console.log("gapi is:", typeof gapi);
    
    return new Promise((resolve, reject) => {
        // Load the client and auth2 modules
        gapi.load("client:auth2", async () => {
            try {
                // Initialize the Google API client
                await gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    clientId: GOOGLE_CLIENT_ID,
                    discoveryDocs: DISCOVERY_DOCS,
                    scope: SCOPES,
                });

                const authInstance = gapi.auth2.getAuthInstance();

                // Sign in if not already signed in
                if (!authInstance.isSignedIn.get()) {
                    await authInstance.signIn();
                }

                // Define time range: now to 7 days from now
                const now = new Date();
                const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                // Fetch calendar events
                const response = await gapi.client.calendar.events.list({
                    calendarId: "primary",
                    timeMin: now.toISOString(),
                    timeMax: nextWeek.toISOString(),
                    showDeleted: false,
                    singleEvents: true,
                    maxResults: 50,
                    orderBy: "startTime",
                });

                // Map the API response to your CalendarEvent type
                const events: CalendarEvent[] = response.result.items.map((event: any) => ({
                    title: event.summary || "No Title",
                    startTime: event.start.dateTime || event.start.date,
                    endTime: event.end.dateTime || event.end.date,
                }));

                resolve(events);
            } catch (error) {
                console.error("Error fetching Google Calendar events:", error);
                reject(error);
            }
        });
    });
}
*/