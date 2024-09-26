import { TestBed } from '@angular/core/testing';

import { AgoraMessagingService } from './agora-messaging-service.service';

describe('AgoraMessagingServiceService', () => {
  let service: AgoraMessagingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgoraMessagingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
