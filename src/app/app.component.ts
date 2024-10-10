import { Component, OnInit } from '@angular/core';
import AgoraRTC, { IAgoraRTCClient, ILocalTrack, ILocalAudioTrack, ILocalVideoTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from '@angular/common';
import { AgoraMessagingService, APIResponse } from './agora-messaging-service.service';
import { v4 as uuidv4 } from 'uuid';
import { firstValueFrom } from 'rxjs';

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
  constructor(private agoraMessagingService: AgoraMessagingService) { }

  // RTC properties
  rtc = {
    client: null as IAgoraRTCClient | null,
    screenClient: null as IAgoraRTCClient | null,
    localAudioTrack: null as ILocalAudioTrack | null,
    localVideoTrack: null as ILocalVideoTrack | null,
    localScreenTrack: null as ILocalVideoTrack | null,
  };

  // Chat properties
  username: string = 'ChatUserName'; // Placeholder for the username
  messageInput: string = '';
  messages: { user: string; text: string }[] = []; // Store chat messages

  isMuted: boolean = false;
  isCameraOff: boolean = false;
  // Agora options
  options = {
    appId: 'f27448ef49134e5aa176ef56fc17bf63',  // Set your App ID
    channel: 'Ankit',       // Channel name
    token: '',
    uid: null as unknown as number   // Ensure uid can be a number or string
  };

  isScreenSharing = false;

  ngOnInit() {
    this.initializeRTCClient();
    this.initializeChat();
  }


  async initializeRTCClient() {
    this.rtc.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.rtc.client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType) => {
      await this.rtc.client?.subscribe(user, mediaType);
      console.log('Subscribed to user:---->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', mediaType);

      if ((mediaType === 'video' && !this.isScreenSharing)) {
        const remoteVideoTrack = user.videoTrack;
        
        const remotePlayerContainer = document.createElement('div');
        remotePlayerContainer.id = `remote-${user.uid}`; // Unique ID for each remote user
        remotePlayerContainer.classList.add('participant'); // Add class for styling
        const remotePlayerContainerShare = document.createElement('div');
        remotePlayerContainerShare.id = `remote-share-${user.uid}`; // Unique ID for each remote user
        remotePlayerContainerShare.classList.add('participant'); // Add class for styling
        
        const participantActionDiv = document.createElement('div');
        participantActionDiv.className = 'participant-action';
        const muteButton = document.createElement('button');
        muteButton.className = 'btn-mute'; // Base class
        muteButton.style.backgroundColor = user.hasAudio ? '' : 'red'; // Set background color to red if muted
        participantActionDiv.appendChild(muteButton);

        const cameraButton = document.createElement('button');
        cameraButton.className = 'btn-camera'; // Base class
        cameraButton.style.backgroundColor = user.hasVideo ? '' : 'red'; // Set background color to red if camera is off
        participantActionDiv.appendChild(cameraButton);

        const nameTag = document.createElement('a');
        nameTag.href = '#';
        nameTag.className = 'name-tag';
        nameTag.textContent = this.username; // Dynamic participant name based on UID
        remotePlayerContainer.appendChild(participantActionDiv);
        remotePlayerContainer.appendChild(nameTag);

        if (mediaType === 'video' && user.hasVideo) {
          const remoteVideoTrack = user.videoTrack;
          remoteVideoTrack?.play(remotePlayerContainer); // Play the video track in the container
        } 
        const videoParticipantElements = document.getElementsByClassName('video-participant');
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
  async joinChannel() {

    this.options.uid = Math.floor(Math.random() * 10000);
   // alert('uid '+this.options.uid);
    const apiData: APIResponse = await firstValueFrom(
      this.agoraMessagingService.getTokenUserChannel(this.options.uid, this.options.channel)
    );

    if (apiData.success) {
      this.options.token = apiData.data;
      await this.rtc.client?.join(this.options.appId, this.options.channel, this.options.token, this.options.uid);
    } else {
      console.error('Error retrieving token:', apiData.error);
    }

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
  displayLocalVideo() {
    const localPlayerContainer = document.getElementById('123456');
    localPlayerContainer != null ? this.rtc.localVideoTrack?.play(localPlayerContainer) : undefined;
  }
  promptForUsername() {
    const usernameInput = prompt('Please enter your name:');
    if (usernameInput) {
      this.username = usernameInput; // Store the entered name
    }
  }
  async toggleScreenShare() {
    if (!this.isScreenSharing) {
      try {
        const screenTracks = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: '1080p'
        }) as ILocalVideoTrack | [ILocalVideoTrack, ILocalAudioTrack];
        if (Array.isArray(screenTracks)) {
          this.rtc.localScreenTrack = screenTracks[0];
        } else {
          this.rtc.localScreenTrack = screenTracks;
        }


        const screenShareUid = this.options.uid = Math.floor(Math.random() * 10000); // Increment UID for demonstration
        // Increment UID for demonstration
        const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        const apiData: APIResponse = await firstValueFrom(
          this.agoraMessagingService.getTokenUserChannel(this.options.uid, this.options.channel)
        );
        if (apiData.success) {
          this.options.token = apiData.data;
          await this.rtc.screenClient?.join(this.options.appId, this.options.channel, this.options.token, screenShareUid);
          this.isScreenSharing = true;

        } else {
          console.error('Error retrieving token:', apiData.error);
        }

       // alert(this.options.token)
        await screenClient.join(this.options.appId, this.options.channel, this.options.token, screenShareUid);

        // Publish the screen track
        if (this.rtc.localScreenTrack) {
          await screenClient.publish(this.rtc.localScreenTrack);
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
        console.log('---->>>>>>>>>>Screen sharing stopped');

        // Remove the screen sharing container
       // this.removeScreenShare();
      } catch (error) {
        console.error('Error stopping screen share:', error);
      }
    }
  }


  sendMessage() {
    //alert(this.messageInput)
    if (this.messageInput.trim()) {
      const messageObj = { user: this.username, text: this.messageInput };
      this.messages.push(messageObj); // Add message to chat history

      // Send message via Agora's messaging service
      const messageData = JSON.stringify(messageObj);
      //alert(JSON.stringify(this.options))
      this.agoraMessagingService.sendMessage(this.options.channel, messageData,this.options.uid);
      this.messageInput = ''; // Clear input after sending
    }
  }
  receiveMessage(messageData: string) {
    const messageObj = JSON.parse(messageData);
    this.messages.push(messageObj); // Add received message to chat history
  }
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
