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
  private userName: string = 'ChatUserName';

  constructor(private http: HttpClient) {}

  // Initialize the Agora Chat client
  initialize(userId: number | null): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        appKey: '611211969#1402208', // Replace with your actual app key
      };
      this.chatClient = new AgoraChat.connection(options); // Initialize Agora Chat client

      this.getChatToken(this.userName).subscribe({
        next: (tokn: string) => {
          const parameters = {
            user: userId?.toString(), // Convert userId to string
            accessToken: tokn,
          };

          this.chatClient.open(parameters).then((res: any) => {
            console.log('Chat login successful:', res);
            this.isClientInitialized = true; // Set isClientInitialized to true after successful login
            resolve(); // Resolve the promise on successful login
          }).catch((error: any) => {
            console.error('Chat login failed:', error);
            reject(error); // Reject the promise if login fails
          });
        },
        error: (error: any) => {
          console.error('Failed to fetch chat token:', error);
          reject(error); // Reject the promise if fetching token fails
        }
      });
    });
  }

  // Send a message
  sendMessage(channelId: string, messageText: string, userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isClientInitialized) {
        // Initialize the client (log in) if not already done
        this.initialize(userId).then(() => {
          // Once login is successful, send the message
          this.sendMessageAfterLogin(channelId, messageText, resolve, reject);
        }).catch((error) => {
          reject(error); // If login fails, reject the promise
        });
      } else {
        // If already initialized (logged in), directly send the message
        this.sendMessageAfterLogin(channelId, messageText, resolve, reject);
      }
    });
  }

  // Helper function to send message after login
  private sendMessageAfterLogin(channelId: string, messageText: string, resolve: Function, reject: Function): void {
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
  }

  // Register a listener for incoming messages
  onMessageReceived(listener: (message: any) => void): void {
    this.messageListener = listener;
  }

  // Method to get the token for a specific user
  getTokenUserChannel(uid: number, channel: string): Observable<APIResponse> {
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

  // Method to get the chat token for the user
  getChatToken(chatUserName: string): Observable<string> {
    const apiUrl = 'https://api.myexpertify.com';
    const url = `${apiUrl}/agora/chat/user/${chatUserName}`; // API endpoint URL
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response && response.success) {
          return response.data; // Assuming response.data contains the token
        } else {
          throw new Error(response.message || 'Failed to get chat token');
        }
      }),
      catchError((error) => {
        console.error('Error fetching chat token:', error);
        return throwError(() => new Error('Error fetching chat token'));
      })
    );
  }
}

