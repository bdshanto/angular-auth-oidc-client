import { async, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataService } from '../api/data.service';
import { DataServiceMock } from '../api/data.service-mock';
import { LoggerService } from '../logging/logger.service';
import { LoggerServiceMock } from '../logging/logger.service-mock';
import { EventTypes } from '../public-events/event-types';
import { PublicEventsService } from '../public-events/public-events.service';
import { StoragePersistanceService } from '../storage/storage-persistance.service';
import { StoragePersistanceServiceMock } from '../storage/storage-persistance.service-mock';
import { AuthWellKnownService } from './auth-well-known.service';
import { AuthWellKnownServiceMock } from './auth-well-known.service-mock';
import { ConfigurationProvider } from './config.provider';
import { ConfigurationProviderMock } from './config.provider-mock';
import { OidcConfigService } from './config.service';

describe('Configuration Service', () => {
    let oidcConfigService: OidcConfigService;
    let loggerService: LoggerService;
    let eventsService: PublicEventsService;
    let configurationProvider: ConfigurationProvider;
    let dataService: DataService;
    let authWellKnownService: AuthWellKnownService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OidcConfigService,
                {
                    provide: LoggerService,
                    useClass: LoggerServiceMock,
                },
                {
                    provide: ConfigurationProvider,
                    useClass: ConfigurationProviderMock,
                },
                {
                    provide: DataService,
                    useClass: DataServiceMock,
                },
                {
                    provide: AuthWellKnownService,
                    useClass: AuthWellKnownServiceMock,
                },
                {
                    provide: StoragePersistanceService,
                    useClass: StoragePersistanceServiceMock,
                },
                PublicEventsService,
            ],
        });
    });

    beforeEach(() => {
        oidcConfigService = TestBed.inject(OidcConfigService);
        loggerService = TestBed.inject(LoggerService);
        eventsService = TestBed.inject(PublicEventsService);
        configurationProvider = TestBed.inject(ConfigurationProvider);
        dataService = TestBed.inject(DataService);
        authWellKnownService = TestBed.inject(AuthWellKnownService);
    });

    it('should create', () => {
        expect(oidcConfigService).toBeTruthy();
    });

    it('should return a promise', () => {
        expect(oidcConfigService.withConfig({})).toEqual(jasmine.any(Promise));
    });

    describe('withConfig', () => {
        it('no given sts server does nothing and logs error', async(() => {
            const config = {};
            spyOn(loggerService, 'logError');

            const promise = oidcConfigService.withConfig(config);

            promise.catch(() => {
                expect(loggerService.logError).toHaveBeenCalled();
            });
        }));

        it('if authWellKnownEndPointsAlreadyStored the events are fired and resolve', async(() => {
            const config = { stsServer: 'stsServerForTesting', authWellknownEndpoint: null };
            spyOn(oidcConfigService as any, 'authWellKnownEndPointsAlreadyStored').and.returnValue(true);
            const eventServiceSpy = spyOn(eventsService, 'fireEvent');

            const promise = oidcConfigService.withConfig(config);

            promise.then(() => {
                expect(eventServiceSpy).toHaveBeenCalledWith(EventTypes.ConfigLoaded, {
                    passedConfig: {
                        stsServer: 'stsServerForTesting',
                        authWellknownEndpoint: 'stsServerForTesting',
                    },
                });
            });
        }));

        it('if passedAuthWellKnownEndpoints are passed, set these, fire event and resolve', async(() => {
            const config = { stsServer: 'stsServerForTesting', authWellknownEndpoint: null };
            const authWellKnown = { issuer: 'issuerForTesting' };
            spyOn(oidcConfigService as any, 'authWellKnownEndPointsAlreadyStored').and.returnValue(false);
            const eventServiceSpy = spyOn(eventsService, 'fireEvent');
            const storeWellKnownEndpointsSpy = spyOn(oidcConfigService as any, 'storeWellKnownEndpoints');

            const promise = oidcConfigService.withConfig(config, authWellKnown);

            promise.then(() => {
                expect(storeWellKnownEndpointsSpy).toHaveBeenCalledWith(authWellKnown);
                expect(eventServiceSpy).toHaveBeenCalledWith(EventTypes.ConfigLoaded, {
                    passedConfig: {
                        stsServer: 'stsServerForTesting',
                        authWellknownEndpoint: 'stsServerForTesting',
                    },
                    wellknownEndPoints: authWellKnown,
                });
            });
        }));

        it('if eagerLoadAuthWellKnownEndpoints is true: call getWellKnownEndPointsFromUrl', async(() => {
            const config = { stsServer: 'stsServerForTesting', eagerLoadAuthWellKnownEndpoints: true };
            spyOn(oidcConfigService as any, 'authWellKnownEndPointsAlreadyStored').and.returnValue(false);
            spyOn(configurationProvider, 'setConfig').and.returnValue(config);
            const getWellKnownEndPointsFromUrlSpy = spyOn(authWellKnownService, 'getWellKnownEndPointsFromUrl').and.returnValue(of(null));

            const promise = oidcConfigService.withConfig(config);

            promise.then(() => {
                expect(getWellKnownEndPointsFromUrlSpy).toHaveBeenCalledWith('stsServerForTesting');
            });
        }));

        it('if eagerLoadAuthWellKnownEndpoints is true: call storeWellKnownEndpoints', async(() => {
            const config = { stsServer: 'stsServerForTesting', eagerLoadAuthWellKnownEndpoints: true };
            spyOn(oidcConfigService as any, 'authWellKnownEndPointsAlreadyStored').and.returnValue(false);
            const storeWellKnownEndpointsSpy = spyOn(oidcConfigService as any, 'storeWellKnownEndpoints').and.returnValue(false);
            spyOn(configurationProvider, 'setConfig').and.returnValue(config);
            spyOn(authWellKnownService, 'getWellKnownEndPointsFromUrl').and.returnValue(of({ issuer: 'issuerForTesting' }));

            const promise = oidcConfigService.withConfig(config);

            promise.then(() => {
                expect(storeWellKnownEndpointsSpy).toHaveBeenCalledWith({ issuer: 'issuerForTesting' });
            });
        }));

        it('if eagerLoadAuthWellKnownEndpoints is true: fire event', async(() => {
            const config = { stsServer: 'stsServerForTesting', eagerLoadAuthWellKnownEndpoints: true };
            spyOn(oidcConfigService as any, 'authWellKnownEndPointsAlreadyStored').and.returnValue(false);
            spyOn(oidcConfigService as any, 'storeWellKnownEndpoints').and.returnValue(false);
            spyOn(configurationProvider, 'setConfig').and.returnValue(config);
            spyOn(authWellKnownService, 'getWellKnownEndPointsFromUrl').and.returnValue(of({ issuer: 'issuerForTesting' }));
            const eventServiceSpy = spyOn(eventsService, 'fireEvent');

            const promise = oidcConfigService.withConfig(config);

            promise.then(() => {
                expect(eventServiceSpy).toHaveBeenCalledWith(EventTypes.ConfigLoaded, {
                    passedConfig: { ...config, authWellknownEndpoint: 'stsServerForTesting' },
                    wellknownEndPoints: { issuer: 'issuerForTesting' },
                });
            });
        }));
    });

    // describe('getWellKnownDocument', () => {
    //     it('should add suffix if it does not exist on current url', () => {
    //         const dataServiceSpy = spyOn(dataService, 'get').and.callFake((url) => {
    //             return of(null);
    //         });

    //         const urlWithoutSuffix = 'myUrl';
    //         const urlWithSuffix = `${urlWithoutSuffix}/.well-known/openid-configuration`;
    //         (oidcConfigService as any).getWellKnownDocument(urlWithoutSuffix);
    //         expect(dataServiceSpy).toHaveBeenCalledWith(urlWithSuffix);
    //     });

    //     it('should not add suffix if it does exist on current url', () => {
    //         const dataServiceSpy = spyOn(dataService, 'get').and.callFake((url) => {
    //             return of(null);
    //         });

    //         const urlWithSuffix = `myUrl/.well-known/openid-configuration`;
    //         (oidcConfigService as any).getWellKnownDocument(urlWithSuffix);
    //         expect(dataServiceSpy).toHaveBeenCalledWith(urlWithSuffix);
    //     });

    //     it('should not add suffix if it does exist in the middle of current url', () => {
    //         const dataServiceSpy = spyOn(dataService, 'get').and.callFake((url) => {
    //             return of(null);
    //         });

    //         const urlWithSuffix = `myUrl/.well-known/openid-configuration/and/some/more/stuff`;
    //         (oidcConfigService as any).getWellKnownDocument(urlWithSuffix);
    //         expect(dataServiceSpy).toHaveBeenCalledWith(urlWithSuffix);
    //     });
    // });
});
