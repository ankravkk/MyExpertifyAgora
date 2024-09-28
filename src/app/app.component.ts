import { Component, OnInit } from '@angular/core';
import AgoraRTC, { IAgoraRTCClient, ILocalTrack, ILocalAudioTrack, ILocalVideoTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from '@angular/common';
import { AgoraMessagingService } from './agora-messaging-service.service';

@Component({
  selector: 'app-root',
  providers: [AgoraMessagingService],
  templateUrl: './app.component.html',
  imports: [FormsModule, CommonModule],
  styleUrls: ['./app.component.css'],
  standalone: true
})
export class AppComponent implements OnInit {
[x: string]: any;
  constructor(private agoraMessagingService: AgoraMessagingService) {}

  // RTC properties
  rtc = {
    client: null as IAgoraRTCClient | null,
    screenClient: null as IAgoraRTCClient | null,
    localAudioTrack: null as ILocalAudioTrack | null,
    localVideoTrack: null as ILocalVideoTrack | null,
    localScreenTrack: null as ILocalVideoTrack | null,
  };

  // Chat properties
  username: string = ''; // Placeholder for the username
  messageInput: string = '';
  messages: { user: string; text: string }[] = []; // Store chat messages
 
  isMuted: boolean = false;
  isCameraOff: boolean = false;
  // Agora options
  options = {
    appId: 'f27448ef49134e5aa176ef56fc17bf63',  // Set your App ID
    channel: 'test',       // Channel name
    token: null,           // Use a temporary token or generate it using your server
    uid: null as unknown as number | string,  // Ensure uid can be a number or string
  };

  isScreenSharing = false;

  ngOnInit() {
    
    this.initializeRTCClient();
   // this.initializeChat();

    // this.agoraMessagingService.initialize(this.options.appId, null, null)
    //   .then(() => {
    //     console.log('Agora chat initialized successfully');
    //     this.agoraMessagingService.onMessageReceived((message) => {
    //       this.messages.push(message);
    //     });
    //   })
    //   .catch(error => {
    //     console.error('Agora chat initialization failed:', error);
    //   });
  }

  // Initialize the RTC client
  async initializeRTCClient() {
    this.rtc.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  
    this.rtc.client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType) => {
      await this.rtc.client?.subscribe(user, mediaType);
      console.log('Subscribed to user:', user.uid);
  
      if ((mediaType === 'video'&&!this.isScreenSharing)) {
        const remoteVideoTrack = user.videoTrack;
      
        // Create a new remote player container for each user
        
        const remotePlayerContainer = document.createElement('div');
        remotePlayerContainer.id = `remote-${user.uid}`; // Unique ID for each remote user
        remotePlayerContainer.classList.add('participant'); // Add class for styling
  
        // Add participant actions (mute and camera buttons)
        const participantActionDiv = document.createElement('div');
        participantActionDiv.className = 'participant-action';
  
        const muteButton = document.createElement('button');
        muteButton.className = 'btn-mute'; // Base class
        muteButton.style.backgroundColor = user.hasAudio ? '' : 'red'; // Set background color to red if muted
        participantActionDiv.appendChild(muteButton);

        muteButton.addEventListener('click', async () => {
          if (user.audioTrack) {
            // Toggle mute/unmute
            if (user.audioTrack.isPlaying) {
              user.audioTrack.stop(); // Mute the user
              muteButton.style.backgroundColor = 'red'; // Change button to red when muted
            }
          }
        });

       const cameraButton = document.createElement('button');
       cameraButton.className = 'btn-camera'; // Base class
       cameraButton.style.backgroundColor = user.hasVideo ? '' : 'red'; // Set background color to red if camera is off
       participantActionDiv.appendChild(cameraButton);
  
        // Add participant name
        const nameTag = document.createElement('a');
        nameTag.href = '#';
        nameTag.className = 'name-tag';
        nameTag.textContent = this.username; // Dynamic participant name based on UID
        remotePlayerContainer.appendChild(participantActionDiv);
        remotePlayerContainer.appendChild(nameTag);
  
         if (mediaType === 'video' && user.hasVideo) {
            const remoteVideoTrack = user.videoTrack;
            remoteVideoTrack?.play(remotePlayerContainer); // Play the video track in the container
        }else {
      // If no video, show a placeholder image
            const placeholderImage = document.createElement('img');
            placeholderImage.src = '/public/img1.jpg'; // Adjust path as necessary
            placeholderImage.alt = 'No video available';
            placeholderImage.classList.add('video-placeholder'); // Optional: add a class for styling
            remotePlayerContainer.appendChild(placeholderImage);
    }
        // Get all elements with the class 'video-participant'
        const videoParticipantElements = document.getElementsByClassName('video-participant');
  
        // Find an available video-participant div that doesn't already have a remote player
        let participantAppended = false;
  
        if (videoParticipantElements.length > 0) {
          for (let i = 0; i < videoParticipantElements.length; i++) {
            const videoParticipant = videoParticipantElements[i];
            if (!videoParticipant.querySelector(`#remote-${user.uid}`)) {
              videoParticipant.appendChild(remotePlayerContainer);
              remoteVideoTrack?.play(remotePlayerContainer); // Play the video track in the created container
              participantAppended = true;
              break;
            }
          }
        }
  
        if (!participantAppended) {
          document.body.appendChild(remotePlayerContainer); // Append to body or a specific container
          remoteVideoTrack?.play(remotePlayerContainer);
        }
      }
  
      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack;
        remoteAudioTrack?.play();
      }
    });
 this.rtc.client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType) => {
  console.log('User unpublished:', user.uid);

  // Handle video unpublishing
  if (mediaType === 'video') {
    const remotePlayerContainer = document.getElementById(`remote-${user.uid}`);
    if (remotePlayerContainer) {
      if (user.videoTrack) {
        user.videoTrack.stop(); 
      }
      remotePlayerContainer.remove();
    }
  }

  // Handle audio unpublishing
  if (mediaType === 'audio') {
    if (user.audioTrack) {
      user.audioTrack.stop(); 
    }
  }
});

  }
  
  // Join the Agora channel
  async joinChannel() {
    this.options.uid = Math.floor(Math.random() * 10000); // Generate a random user ID
    await this.rtc.client?.join(this.options.appId, this.options.channel, this.options.token, this.options.uid);

    const localTracks = await Promise.all([
      AgoraRTC.createMicrophoneAudioTrack(),
      AgoraRTC.createCameraVideoTrack(),
    ]);

    // Assign tracks safely
    if (Array.isArray(localTracks)) {
      this.rtc.localAudioTrack = localTracks[0];
      this.rtc.localVideoTrack = localTracks[1];
    }

    const tracksToPublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
    if (this.rtc.localAudioTrack) tracksToPublish.push(this.rtc.localAudioTrack);
    if (this.rtc.localVideoTrack) tracksToPublish.push(this.rtc.localVideoTrack);

    await this.rtc.client?.publish(tracksToPublish);
    this.displayLocalVideo();
    console.log('Joined channel and published stream!');
  }

  // Leave the Agora channel
  async leaveChannel() {
    if (this.rtc.localAudioTrack) this.rtc.localAudioTrack.close();
    if (this.rtc.localVideoTrack) this.rtc.localVideoTrack.close();

    try {
      await this.rtc.client?.leave();
      document.getElementById(this.options.uid!.toString())?.remove();
      console.log('Left channel');
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  }

  // Display the local video track
  displayLocalVideo() {
    const localPlayerContainer = document.getElementById('123456');
    localPlayerContainer != null ? this.rtc.localVideoTrack?.play(localPlayerContainer):undefined;
  }
  promptForUsername() {
    const usernameInput = prompt('Please enter your name:');
    if (usernameInput) {
      this.username = usernameInput; // Store the entered name
    }
  }


  // Toggle screen sharing

  async toggleScreenShare() {
    if (!this.isScreenSharing) {
      this.isScreenSharing = true;
  
      // Generate a new UID for the screen sharing participant
      const screenShareUid = this.options.uid + '1'; // Increment UID for demonstration
  
      // Create a new client for screen sharing
      const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  
      try {
        // Create screen track
        const screenTracks = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: '1080p'
        }) as ILocalVideoTrack | [ILocalVideoTrack, ILocalAudioTrack];
  
        if (Array.isArray(screenTracks)) {
          this.rtc.localScreenTrack = screenTracks[0];
        } else {
          this.rtc.localScreenTrack = screenTracks;
        }
  
        // Join the screen sharing channel with a new UID
        await screenClient.join(this.options.appId, this.options.channel, this.options.token, screenShareUid);
  
        // Publish the screen track
        if (this.rtc.localScreenTrack) {
          await screenClient.publish(this.rtc.localScreenTrack);
          console.log('Screen sharing started');
  
          // Add the screen sharing video to a separate container
         // this.displayScreenShare();
        }
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    } else {
      this.isScreenSharing = false;
  
      // Stop the screen track
      if (this.rtc.localScreenTrack) {
        this.rtc.localScreenTrack.close();
        this.rtc.localScreenTrack = null;
      }
  
      try {
        // Leave the screen sharing channel
        await this.rtc.screenClient?.leave();
        console.log('Screen sharing stopped');
  
        // Remove the screen sharing container
        this.removeScreenShare();
      } catch (error) {
        console.error('Error stopping screen share:', error);
      }
    }
  }
  
  // Display screen share in a separate container
  displayScreenShare() {
    const screenShareContainer = document.getElementById('screen-share-container');
    if (!screenShareContainer) {
      // Create a new div if it doesn't exist
      const newScreenShareContainer = document.createElement('div');
      newScreenShareContainer.id = 'screen-share-container';
      newScreenShareContainer.classList.add('video-participant-screen');
  
      document.body.appendChild(newScreenShareContainer); // Append to body or specific container
      //this.rtc.localScreenTrack?.play(newScreenShareContainer);
      //alert(JSON.stringify(this.rtc.localScreenTrack));
    } else {
      alert("here no");
      //this.rtc.localScreenTrack?.play(screenShareContainer);
    }
  }
  
  // Remove the screen share container when screen sharing is stopped
  removeScreenShare() {
    const screenShareContainer = document.getElementById('screen-share-container');
    if (screenShareContainer) {
      screenShareContainer.remove();
    }
  }
  
  // Send chat messages
  sendMessage() {
    if (this.messageInput.trim()) {
      const messageObj = { user: this.username, text: this.messageInput };
      this.messages.push(messageObj); // Add message to chat history

      // Send message via Agora's messaging service
      const messageData = JSON.stringify(messageObj);
      this.agoraMessagingService.sendMessage(this.options.channel, messageData);

      this.messageInput = ''; // Clear input after sending
    }
  }

  // Receive chat messages
  receiveMessage(messageData: string) {
    const messageObj = JSON.parse(messageData);
    this.messages.push(messageObj); // Add received message to chat history
  }

  // Initialize chat functionality
  initializeChat() {
    this.agoraMessagingService.onMessageReceived((messageData) => {
      this.receiveMessage(messageData);
    });
  }
  toggleMute() {
    if (this.rtc.localAudioTrack) {
      if (!this.isMuted) {
        this.rtc.localAudioTrack.setEnabled(false);  // Mute the audio
        console.log('Audio muted');
      } else {
        this.rtc.localAudioTrack.setEnabled(true);   // Unmute the audio
        console.log('Audio unmuted');
      }
      this.isMuted = !this.isMuted; // Toggle the mute state
    }
  }

  // Turn on/off the camera
  toggleCamera() {
    if (this.rtc.localVideoTrack) {
      if (!this.isCameraOff) {
        this.rtc.localVideoTrack.setEnabled(false);  // Turn off the camera
        console.log('Camera turned off');
      } else {
        this.rtc.localVideoTrack.setEnabled(true);   // Turn on the camera
        console.log('Camera turned on');
      }
      this.isCameraOff = !this.isCameraOff; // Toggle the camera state
    }
  }
}
