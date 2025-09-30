import { google } from 'googleapis';

class GoogleCalendarService {
  getAuthClient(tokens) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }

  async createEvent(tokens, eventData) {
    const auth = this.getAuthClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: eventData.title || 'Training Session',
      description: eventData.description || '',
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
        ],
      },
      colorId: '4', // Red for training
    };

    try {
      const response = await calendar.events.insert({
        calendarId: eventData.calendarId || 'primary',
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error.message);
      throw error;
    }
  }

  async batchCreateEvents(tokens, events) {
    const auth = this.getAuthClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const createdEvents = [];

    for (const eventData of events) {
      try {
        const event = {
          summary: eventData.title || 'Training Session',
          description: eventData.description || '',
          start: {
            dateTime: eventData.startTime,
            timeZone: eventData.timeZone || 'UTC',
          },
          end: {
            dateTime: eventData.endTime,
            timeZone: eventData.timeZone || 'UTC',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 60 },
            ],
          },
          colorId: '4',
        };

        const response = await calendar.events.insert({
          calendarId: eventData.calendarId || 'primary',
          resource: event,
        });

        createdEvents.push(response.data);
      } catch (error) {
        console.error(`Error creating event "${eventData.title}":`, error.message);
        createdEvents.push({ error: error.message, eventData });
      }
    }

    return createdEvents;
  }

  async getEvents(tokens, timeMin, timeMax) {
    const auth = this.getAuthClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items;
    } catch (error) {
      console.error('Error fetching calendar events:', error.message);
      throw error;
    }
  }

  async deleteEvent(tokens, eventId, calendarId = 'primary') {
    const auth = this.getAuthClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error.message);
      throw error;
    }
  }

  async updateEvent(tokens, eventId, eventData, calendarId = 'primary') {
    const auth = this.getAuthClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'UTC',
      },
    };

    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error.message);
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
