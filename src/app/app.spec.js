/* jshint camelcase: false*/
/* global describe, beforeEach, module, it, inject, expect, jasmine */

(function() {
  'use strict';

  describe('spf', function() {

    /**
     * Test core singpath fire controllers.
     *
     */
    describe('controllers', function() {
      var $controller, $rootScope, $q;

      beforeEach(module('spf'));

      beforeEach(inject(function(_$rootScope_, _$q_, _$controller_) {
        $controller = _$controller_;
        $rootScope = _$rootScope_;
        $q = _$q_;
      }));


      /**
       * Test SpfNavBarCtrl.
       */
      describe('SpfNavBarCtrl', function() {
        var ctrl, alert, auth;

        beforeEach(function() {
          auth = jasmine.createSpyObj('spfAuth', ['login', 'logout']);
          alert = jasmine.createSpy('spfAlert');
          ['info', 'success', 'warning', 'danger'].map(function(k) {
            alert[k] = jasmine.createSpy(k);
          });
          ctrl = $controller('SpfNavBarCtrl', {
            spfAuth: auth,
            spfAlert: alert
          });

        });

        it('should have auth attribute', function() {
          expect(ctrl.auth).toBe(auth);
        });

        it('should login users', function() {
          var resp = {
            uid: '1234'
          };
          var result;

          auth.login.and.returnValue($q.when(resp));

          ctrl.login().then(function(resp) {
            result = resp;
          });
          $rootScope.$apply();

          expect(result).toBe(resp);
        });

        it('should alert users when login fails', function() {
          var e = new Error('I want it to fail');

          auth.login.and.returnValue($q.reject(e));

          ctrl.login();
          $rootScope.$apply();

          expect(alert.warning).toHaveBeenCalled();
        });

        it('should reject login promise on error', function() {
          var e = new Error('I want it to fail');
          var result;

          auth.login.and.returnValue($q.reject(e));

          ctrl.login().catch(function(e) {
            result = e;
          });
          $rootScope.$apply();

          expect(result).toBe(e);
        });

      });


    });


    /**
     * Test core singpath fire services
     */
    describe('services', function() {


      describe('crypto', function() {

        describe('password', function() {
          var provider, crypto;

          beforeEach(module('spf', function(cryptoProvider) {
            provider = cryptoProvider;
          }));

          beforeEach(inject(function(_crypto_) {
            crypto = _crypto_;
          }));

          it('should create a hash using 256b hash (128b salt, 2024 iteration', function() {
            var hash = crypto.password.newHash('foo');

            expect(hash.hasher).toBe('PBKDF2');
            expect(hash.prf).toBe('SHA256');
            expect(hash.value.length).toBe(256 / 8 * 2); // 256 bit hex encoded
            expect(hash.salt.length).toBe(128 / 8 * 2); // 64 bit hex encoded
            expect(hash.iterations).toBe(2024);
          });

          it('should let you configure the hasher', function() {
            var hash;

            provider.setSaltSize(128 / 8);
            provider.setHashKeySize(128 / 32);
            provider.setIterations(100);

            hash = crypto.password.newHash('foo');

            expect(hash.value.length).toBe(128 / 8 * 2); // 256 bit hex encoded
            expect(hash.salt.length).toBe(128 / 8 * 2); // 64 bit hex encoded
            expect(hash.iterations).toBe(100);
          });

          it('should be able to create hash from salts and options', function() {
            var hash = crypto.password.fromSalt('password', '11111111', {
              keySize: 128 / 32,
              iterations: 10,
              prf: 'SHA1'
            });

            expect(hash).toBe('1a9e75789b45e1e072d420e2995ad5f9');
          });

        });

      });


      describe('spfFirebaseRef', function() {
        var provider, factory, Firebase, firebaseSpy, spfFirebaseRef, ref;

        beforeEach(module('spf', function(spfFirebaseRefProvider) {
          var log = jasmine.createSpyObj('$log', ['info']);
          provider = spfFirebaseRefProvider;
          firebaseSpy = jasmine.createSpy('Firebase');
          ref = jasmine.createSpyObj('ref', ['child']);
          ref.child.and.returnValue(ref);
          Firebase = function(url) {
            firebaseSpy(url);
            this.child = ref.child.bind(ref);
          };
          factory = function() {
            return provider.$get.slice(-1).pop()({
              Firebase: Firebase
            }, log);
          };
        }));

        it('should return a Firebase ref', inject(function() {
          spfFirebaseRef = factory();
          expect(spfFirebaseRef().constructor).toBe(Firebase);
        }));

        it('should return ref to singpath database', function() {
          spfFirebaseRef = factory();
          spfFirebaseRef();
          expect(firebaseSpy).toHaveBeenCalledWith('https://singpath.firebaseio.com/');
        });

        it('should allow to configure the ref baseurl', function() {
          provider.setBaseUrl('https://singpath-dev.firebaseio.com/');
          spfFirebaseRef = factory();
          spfFirebaseRef();
          expect(firebaseSpy).toHaveBeenCalledWith('https://singpath-dev.firebaseio.com/');
        });

        it('should allow to point to a specific child path', function() {
          spfFirebaseRef = factory();
          spfFirebaseRef('auth', 'users');
          expect(ref.child.calls.count()).toBe(2);
          expect(ref.child.calls.argsFor(0)).toEqual(['auth']);
          expect(ref.child.calls.argsFor(1)).toEqual(['users']);
        });

      });


      describe('spfAuth', function() {
        var auth, spfFirebaseRef;

        beforeEach(module('spf'));

        beforeEach(function() {
          var $firebaseAuth;

          spfFirebaseRef = jasmine.createSpy('spfFirebaseRef');
          auth = jasmine.createSpyObj('auth', ['$getAuth', '$authWithOAuthPopup', '$authWithOAuthRedirect', '$unauth']);
          $firebaseAuth = jasmine.createSpy('$firebaseAuth').and.returnValue(auth);

          module(function($provide) {
            $provide.value('spfFirebaseRef', spfFirebaseRef);
            $provide.value('$firebaseAuth', $firebaseAuth);
          });

        });

        it('should authenticate current user', function() {
          var user = {
            uid: '1234'
          };

          auth.$getAuth.and.returnValue(user);

          inject(function(spfAuth) {
            expect(spfAuth.user).toBe(user);
          });
        });

        it('should authenticate current user (guest)', function() {
          auth.$getAuth.and.returnValue(null);

          inject(function(spfAuth) {
            expect(spfAuth.user).toBeNull();
          });
        });


        describe('login', function() {
          var user;

          beforeEach(function() {
            user = {
              uid: '1234'
            };
          });

          it('should authenticate against a google account', function() {
            auth.$getAuth.and.returnValue(null);

            inject(function($q, spfAuth) {
              auth.$authWithOAuthPopup.and.returnValue($q.when(user));

              spfAuth.login();
              expect(auth.$authWithOAuthPopup).toHaveBeenCalledWith('google');
            });
          });

          it('should set spfAuth.user on success', function() {
            auth.$getAuth.and.returnValue(null);

            inject(function($q, spfAuth, $rootScope) {
              auth.$authWithOAuthPopup.and.returnValue($q.when(user));

              spfAuth.login();
              $rootScope.$apply();
              expect(spfAuth.user).toBe(user);
            });
          });

          it('should resolve to auth user on success', function() {
            auth.$getAuth.and.returnValue(null);

            inject(function($q, spfAuth, $rootScope) {
              var result;

              auth.$authWithOAuthPopup.and.returnValue($q.when(user));

              spfAuth.login().then(function(resp) {
                result = resp;
              });

              $rootScope.$apply();
              expect(result).toBe(user);
            });
          });

          it('should reject on error', function() {
            auth.$getAuth.and.returnValue(null);

            inject(function($q, spfAuth, $rootScope) {
              var result;
              var err = new Error();

              auth.$authWithOAuthPopup.and.returnValue($q.reject(err));

              spfAuth.login().catch(function(e) {
                result = e;
              });

              $rootScope.$apply();
              expect(result).toBe(err);
            });
          });

          it('should resolve to $firebaseAuth.$authWithOAuthRedirect promise when popup is not available', function() {
            auth.$getAuth.and.returnValue(null);

            inject(function($q, spfAuth, $rootScope) {
              var result;
              var err = new Error();
              var redirectResult = {};

              err.code = 'TRANSPORT_UNAVAILABLE';
              auth.$authWithOAuthPopup.and.returnValue($q.reject(err));
              // I am guessing the redirect promise only resolve if it fails
              // (redirect not available), but for the test it doesn't matter.
              auth.$authWithOAuthRedirect.and.returnValue($q.when(redirectResult));

              spfAuth.login().then(function(resp) {
                result = resp;
              });

              $rootScope.$apply();
              expect(result).toBe(redirectResult);
            });
          });

          it('should authenticate against a google account when popup is not available', function() {
            auth.$getAuth.and.returnValue(null);

            inject(function($q, spfAuth, $rootScope) {
              var err = new Error();
              var redirectResult = {};

              err.code = 'TRANSPORT_UNAVAILABLE';
              auth.$authWithOAuthPopup.and.returnValue($q.reject(err));
              auth.$authWithOAuthRedirect.and.returnValue($q.when(redirectResult));

              spfAuth.login();
              $rootScope.$apply();
              expect(auth.$authWithOAuthRedirect).toHaveBeenCalledWith('google');
            });
          });

          it('should reject when neither popup or redirect is available', function() {
            auth.$getAuth.and.returnValue(null);

            inject(function($q, spfAuth, $rootScope) {
              var result;
              var popUpErr = new Error();
              var redirectErr = new Error();

              popUpErr.code = 'TRANSPORT_UNAVAILABLE';
              auth.$authWithOAuthPopup.and.returnValue($q.reject(popUpErr));
              auth.$authWithOAuthRedirect.and.returnValue($q.reject(redirectErr));

              spfAuth.login().catch(function(e) {
                result = e;
              });

              $rootScope.$apply();
              expect(result).toBe(redirectErr);
            });
          });

        });


        describe('logout', function() {

          it('should unauthenticates current user', function() {
            auth.$getAuth.and.returnValue({
              uid: '1234'
            });

            inject(function($q, spfAuth) {
              auth.$unauth.and.returnValue(null);

              spfAuth.logout();
              expect(auth.$unauth).toHaveBeenCalled();
            });
          });

          it('should reset spfAuth.user', function() {
            auth.$getAuth.and.returnValue({
              uid: '1234'
            });

            inject(function($q, spfAuth) {
              auth.$unauth.and.returnValue(null);

              spfAuth.logout();
              expect(auth.user).toBeUndefined();
            });
          });

        });

      });


      describe('spfAlert', function() {
        var $alert, spfAlert;

        beforeEach(module('spf'));

        beforeEach(function() {
          module(function($provide) {
            $alert = jasmine.createSpy();
            $alert.and.returnValue(null);
            $provide.value('$alert', $alert);
          });

          inject(function(_spfAlert_) {
            spfAlert = _spfAlert_;
          });
        });

        it('should alert users', function() {
          spfAlert('Title', 'Content');
          expect($alert.calls.mostRecent().args[0].content).toBe('Content');
          expect($alert.calls.mostRecent().args[0].title).toBe('Title');
          expect($alert.calls.mostRecent().args[0].type).toBe('title');
        });

        describe('spfAlert.success', function() {

          it('should send a notification of type "success"', function() {
            spfAlert.success('Content');
            expect($alert.calls.mostRecent().args[0].content).toBe('Content');
            expect($alert.calls.mostRecent().args[0].title).toBe('Success');
            expect($alert.calls.mostRecent().args[0].type).toBe('success');
          });

        });

        describe('spfAlert.info', function() {

          it('should send a notification of type "info"', function() {
            spfAlert.info('Content');
            expect($alert.calls.mostRecent().args[0].content).toBe('Content');
            expect($alert.calls.mostRecent().args[0].title).toBe('Info');
            expect($alert.calls.mostRecent().args[0].type).toBe('info');
          });

        });

        describe('spfAlert.warning', function() {

          it('should send a notification of type "warning"', function() {
            spfAlert.warning('Content');
            expect($alert.calls.mostRecent().args[0].content).toBe('Content');
            expect($alert.calls.mostRecent().args[0].title).toBe('Warning');
            expect($alert.calls.mostRecent().args[0].type).toBe('warning');
          });

        });

        describe('spfAlert.danger', function() {

          it('should send a notification of type "danger"', function() {
            spfAlert.danger('Content');
            expect($alert.calls.mostRecent().args[0].content).toBe('Content');
            expect($alert.calls.mostRecent().args[0].title).toBe('Danger');
            expect($alert.calls.mostRecent().args[0].type).toBe('danger');
          });

        });

      });

    });


  });

})();
