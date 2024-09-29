import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import  AgoraChat from 'agora-chat'; // Correct import for Agora Chat
import { catchError, map, Observable, throwError } from 'rxjs';

export interface APIResponse{
 success : string,
 data: string,
 error:String
}


@Injectable({
  providedIn: 'root'
})



export class AgoraMessagingService {
  private chatClient: any; // Store AgoraChat client instance
  private messageListener!: (message: any) => void;
  private isClientInitialized = false;
  private appKey = ''; // Store your Agora App Key
  
  constructor(private http: HttpClient) {

  }

  // Initialize the Agora Chat client
  initialize(appKey: string, userId: string|null, token: string|null): Promise<void> {
    this.appKey = appKey; // Store app key

    return new Promise((resolve, reject) => {
      const options = {
        appKey: this.appKey,
      };

      this.chatClient = new AgoraChat.connection(options); // Initialize Agora Chat client

      this.chatClient.open({
        user: userId,
        accessToken: token,
      })
        .then(() => {
          console.log('Login successful');
          this.isClientInitialized = true; // Mark client as initialized
          this.setupMessageListener(); // Setup message listener after login
          resolve();
        })
        .catch((error: any) => {
          console.error('Login failed:', error);
          this.isClientInitialized = false; // Mark initialization as failed
          reject(error);
        });
    });
  }

  // Set up the message listener
  private setupMessageListener(): void {
    this.chatClient.addEventHandler('onTextMessage', (message: any) => {
      if (this.messageListener) {
        this.messageListener(message);
      }
    });
  }

  // Register a listener for incoming messages
  onMessageReceived(listener: (message: any) => void): void {
    this.messageListener = listener;
  }

  // Send a message
  sendMessage(channelId: string, messageText: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isClientInitialized) {
        console.error('Chat client is not initialized');
        return reject('Chat client is not initialized');
      }

      const message = {
        chatType: 'singleChat',
        type: 'txt',
        to: channelId,
        msg: messageText,
      };

      this.chatClient.send(message)
        .then(() => {
          console.log('Message sent successfully');
          resolve();
        })
        .catch((error: any) => {
          console.error('Failed to send message:', error);
          reject(error);
        });
    });
  }

  // Method to get the token for a specific user
  getToken(): Observable<APIResponse> {
    const apiUrl = 'https://api.myexpertify.com/agora/chat/app/token';
    return this.http.get<APIResponse>(`${apiUrl}`).pipe(
      map((res) => res), // Extract the data field from the response
      catchError((error) => {
        console.error('Error fetching token', error);
        return []; // Handle error, returning an empty array or other appropriate fallback
      })
    );
  }

  getTokenChannel(uid: number, channel: string): Observable<APIResponse> {
    const apiUrl = 'https://api.myexpertify.com/agora/chat/user/channel';
    const url = `${apiUrl}?uid=${uid}&channel=${channel}`;
    return this.http.get<APIResponse>(url).pipe(
      map((res) => res), // Directly returning the response
      catchError((error) => {
        console.error('Error fetching token', error);
        return throwError(() => new Error('Error fetching token')); // Handle error appropriately
      })
    );
}

}
