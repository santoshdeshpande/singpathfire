(function() {
  'use strict';

  angular.module('clm').

  config([
    '$routeProvider',
    'routes',
    function($routeProvider, routes) {
      $routeProvider.when(routes.events, {
        templateUrl: 'classmentors/components/events/events-view-list.html',
        controller: 'ClassMentorsEventList',
        controllerAs: 'ctrl',
        resolve: {
          'initialData': [
            'classMentorsEventListRsolver',
            function(classMentorsEventListRsolver) {
              return classMentorsEventListRsolver();
            }
          ]
        }
      }).

      when(routes.newEvent, {
        templateUrl: 'classmentors/components/events/events-view-new.html',
        controller: 'NewEventCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'initialData': [
            'newEventCtrlInitialData',
            function(newEventCtrlInitialData) {
              return newEventCtrlInitialData();
            }
          ]
        }
      }).

      when(routes.oneEvent, {
        templateUrl: 'classmentors/components/events/events-view-event.html',
        controller: 'ViewEventCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'initialData': [
            'viewEventCtrlInitialData',
            function(viewEventCtrlInitialData) {
              return viewEventCtrlInitialData();
            }
          ]
        }
      }).

      when(routes.editEvent, {
        templateUrl: 'classmentors/components/events/events-view-event-edit.html',
        controller: 'EditCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'initialData': [
            'editCtrlInitialData',
            function(editCtrlInitialData) {
              return editCtrlInitialData();
            }
          ]
        }
      }).

      when(routes.addEventTask, {
        templateUrl: 'classmentors/components/events/events-view-event-task-form.html',
        controller: 'AddEventTaskCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'initialData': [
            'editCtrlInitialData',
            function(editCtrlInitialData) {
              return editCtrlInitialData();
            }
          ]
        }
      }).

      when(routes.editEventTask, {
        templateUrl: 'classmentors/components/events/events-view-event-task-form.html',
        controller: 'EditEventTaskCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'initialData': [
            'editEventTaskCtrlInitialData',
            function(editEventTaskCtrlInitialData) {
              return editEventTaskCtrlInitialData();
            }
          ]
        }
      })

      ;
    }
  ]).

  /**
   * Used to resolve `initialData` of `SomeCtrl`.
   *
   */
  factory('classMentorsEventListRsolver', [
    '$q',
    'spfAuth',
    'clmDataStore',
    function classMentorsEventListRsolverFactory($q, spfAuth, clmDataStore) {
      return function classMentorsEventRsolver() {
        return $q.all({
          events: clmDataStore.events.list(),
          auth: spfAuth
        });
      };
    }
  ]).

  /**
   * SomeCtrl
   *
   */
  controller('ClassMentorsEventList', [
    'initialData',
    'spfNavBarService',
    'urlFor',
    function ClassMentorsEventList(initialData, spfNavBarService, urlFor) {
      this.events = initialData.events;
      this.auth = initialData.auth;

      spfNavBarService.update(
        'Events',
        undefined, [{
          title: 'New event',
          url: '#' + urlFor('newEvent'),
          icon: 'add-circle-outline'
        }]
      );
    }
  ]).

  /**
   * Used to resolve `initialData` of `NewEventCtrl`.
   *
   */
  factory('newEventCtrlInitialData', [
    '$q',
    'spfAuth',
    'spfAuthData',
    'clmDataStore',
    function newEventCtrlInitialDataFactory($q, spfAuth, spfAuthData, clmDataStore) {
      return function newEventCtrlInitialData() {
        var userPromise = spfAuthData.user();
        var profilePromise;
        var errLoggedOff = new Error('The user should be logged in to create an event.');

        if (!spfAuth.user || !spfAuth.user.uid) {
          return $q.reject(errLoggedOff);
        }

        profilePromise = userPromise.then(function(userData) {
          if (!userData.publicId) {
            return;
          }

          return clmDataStore.profile(userData.publicId).then(function(profile) {
            if (profile && profile.$value === null) {
              return clmDataStore.initProfile(userData);
            }

            return profile;
          });
        });

        return $q.all({
          auth: spfAuth,
          currentUser: userPromise,
          profile: profilePromise
        });
      };
    }
  ]).

  /**
   * NewEventCtrl
   *
   */
  controller('NewEventCtrl', [
    '$q',
    '$location',
    'initialData',
    'urlFor',
    'spfAuthData',
    'spfAlert',
    'spfNavBarService',
    'clmDataStore',
    function NewEventCtrl(
      $q, $location, initialData, urlFor, spfAuthData, spfAlert, spfNavBarService, clmDataStore
    ) {
      var self = this;

      this.auth = initialData.auth;
      this.currentUser = initialData.currentUser;
      this.profile = initialData.profile;

      this.creatingEvent = false;

      spfNavBarService.update(
        'New Events',
        {
          title: 'Events',
          url: '#' + urlFor('events')
        }, []
      );

      this.save = function(currentUser, newEvent, password) {
        var next;

        self.creatingEvent = true;

        if (!self.profile) {
          next = spfAuthData.publicId(currentUser).then(function() {
            spfAlert.success('Public id and display name saved');
            return clmDataStore.initProfile(currentUser);
          }).then(function(profile) {
            self.profile = profile;
            return profile;
          });
        } else {
          next = $q.when();
        }

        next.then(function() {
          var data = Object.assign({
            owner: {
              publicId: currentUser.publicId,
              displayName: currentUser.displayName,
              gravatar: currentUser.gravatar
            },
            createdAt: {
              '.sv': 'timestamp'
            }
          }, newEvent);

          return clmDataStore.events.create(data, password);
        }).then(function() {
          spfAlert.success('New event created.');
          $location.path(urlFor('events'));
        }).catch(function(e) {
          spfAlert.error(e.toString());
        }).finally(function() {
          self.creatingEvent = false;
        });
      };

      this.reset = function(eventForm) {
        this.newEvent = {
          data: {},
          password: ''
        };

        if (eventForm && eventForm.$setPristine) {
          eventForm.$setPristine();
        }
      };

      this.reset();
    }
  ]).

  /**
   * Used to resolve `initialData` of `ViewEventCtrl`.
   *
   */
  factory('viewEventCtrlInitialData', [
    '$q',
    '$route',
    'spfAuth',
    'spfAuthData',
    'clmDataStore',
    function viewEventCtrlInitialDataFactory($q, $route, spfAuth, spfAuthData, clmDataStore) {
      return function viewEventCtrlInitialData() {
        var errNoEvent = new Error('Event not found');
        var eventId = $route.current.params.eventId;

        var eventPromise = clmDataStore.events.get(eventId).then(function(event) {
          if (event.$value === null) {
            return $q.reject(errNoEvent);
          }
          return event;
        });

        return $q.all({
          currentUser: spfAuthData.user(),
          event: eventPromise,
          participants: clmDataStore.events.participants(eventId)
        });
      };
    }
  ]).

  /**
   * ViewEventCtrl
   *
   */
  controller('ViewEventCtrl', [
    'initialData',
    '$document',
    '$mdDialog',
    'spfAlert',
    'urlFor',
    'spfNavBarService',
    'clmDataStore',
    function ViewEventCtrl(initialData, $document, $mdDialog, spfAlert, urlFor, spfNavBarService, clmDataStore) {
      var self = this;

      this.currentUser = initialData.currentUser;
      this.event = initialData.event;
      this.participants = initialData.participants;

      updateNavbar();

      function updateNavbar() {
        spfNavBarService.update(
          self.event.title, {
            title: 'Events',
            url: '#' + urlFor('events')
          }, getOptions()
        );
      }

      function getOptions() {
        var options = [];

        if (!self.currentUser || !self.currentUser.publicId) {
          return options;
        }

        // add join/leave button
        if (self.participants.$indexFor(self.currentUser.publicId) > -1) {
          options.push({
            title: 'Leave',
            onClick: function() {
              clmDataStore.events.leave(self.event.$id);
              updateNavbar();
            },
            icon: 'highlight-remove'
          });
        } else {
          options.push({
            title: 'Join',
            onClick: promptPassword,
            icon: 'add-circle-outline'
          });
        }

        // Add edit button
        if (self.event.owner.publicId === self.currentUser.publicId) {
          options.push({
            title: 'Edit',
            url: '#' + urlFor('editEvent', {eventId: self.event.$id}),
            icon: 'create'
          });
        }

        return options;
      }

      function promptPassword() {
        $mdDialog.show({
          parent: $document.body,
          templateUrl: 'classmentors/components/events/events-view-password.html',
          controller: DialogController,
          controllerAs: 'ctrl'
        });

        function DialogController() {
          this.pw = '';

          this.join = function(pw) {
            clmDataStore.events.join(self.event.$id, pw).then(function() {
              spfAlert.success('You joined this event');
              updateNavbar();
            }).catch(function(err) {
              spfAlert.error('Failed to add you: ' + err);
            });
            this.closeDialog();
          };

          this.closeDialog = function() {
            $mdDialog.hide();
          };
        }
      }
    }
  ]).

  /**
   * Used to resolve `initialData` of `EditCtrl` and `AddEventTaskCtrl`.
   *
   * Load the event data and the current user data.
   *
   * The promise will resolved to an error if the the current user
   * is not the owner of the event.
   *
   */
  factory('editCtrlInitialData', [
    '$q',
    '$route',
    'spfAuthData',
    'clmDataStore',
    function editCtrlInitialDataFactory($q, $route, spfAuthData, clmDataStore) {
      return function editCtrlInitialData() {
        var errNoEvent = new Error('Event not found');
        var errNotAuthaurized = new Error('You cannot edit this event');
        var eventId = $route.current.params.eventId;

        var eventPromise = clmDataStore.events.get(eventId).then(function(event) {
          if (event.$value === null) {
            return $q.reject(errNoEvent);
          }
          return event;
        });

        return $q.all({
          currentUser: spfAuthData.user(),
          event: eventPromise
        }).then(function(data) {
          if (
            !data.currentUser.publicId ||
            !data.event.owner ||
            !data.event.owner.publicId ||
            data.event.owner.publicId !== data.currentUser.publicId
          ) {
            return $q.reject(errNotAuthaurized);
          } else {
            return data;
          }
        });
      };
    }
  ]).

  /**
   * EditCtrl
   *
   */
  controller('EditCtrl', [
    'initialData',
    'spfNavBarService',
    'urlFor',
    'spfAlert',
    'clmDataStore',
    function EditCtrl(initialData, spfNavBarService, urlFor) {

      this.event = initialData.event;

      spfNavBarService.update(
        'Edit', [{
          title: 'Events',
          url: '#' + urlFor('events')
        }, {
          title: this.event.title,
          url: '#' + urlFor('oneEvent', {eventId: this.event.$id})
        }], [{
          title: 'New Challenge',
          url: '#' + urlFor('addEventTask', {eventId: this.event.$id}),
          icon: 'create'
        }]
      );
    }
  ]).

  /**
   * AddEventTaskCtrl
   *
   */
  controller('AddEventTaskCtrl', [
    'initialData',
    '$location',
    'spfAlert',
    'urlFor',
    'spfNavBarService',
    'clmDataStore',
    function AddEventTaskCtrl(initialData, $location, spfAlert, urlFor, spfNavBarService, clmDataStore) {
      var self = this;

      this.event = initialData.event;
      this.task = {};
      this.savingTask = false;

      spfNavBarService.update(
        'New Challenge', [{
          title: 'Events',
          url: '#' + urlFor('events')
        }, {
          title: this.event.title,
          url: '#' + urlFor('oneEvent', {eventId: this.event.$id})
        }, {
          title: 'Challenges',
          url: '#' + urlFor('editEvent', {eventId: this.event.$id})
        }]
      );

      this.saveTask = function(event, _, task) {
        self.creatingTask = true;
        clmDataStore.events.addTask(event.$id, task).then(function() {
          spfAlert.success('Task created');
          $location.path(urlFor('editEvent', {eventId: self.event.$id}));
        }).catch(function(err) {
          spfAlert.error(err);
        }).finally(function() {
          self.creatingTask = false;
        });
      };
    }
  ]).

  /**
   * Used to resolve `initialData` of `EditEventTaskCtrl`.
   *
   */
  factory('editEventTaskCtrlInitialData', [
    '$q',
    '$route',
    'spfAuthData',
    'clmDataStore',
    function editEventTaskCtrlInitialDataFactory($q, $route, spfAuthData, clmDataStore) {
      return function editEventTaskCtrlInitialData() {
        var errNoEvent = new Error('Event not found');
        var errNoTask = new Error('Event not found');
        var errNotAuthaurized = new Error('You cannot edit this event');
        var eventId = $route.current.params.eventId;
        var taskId = $route.current.params.taskId;

        var eventPromise = clmDataStore.events.get(eventId).then(function(event) {
          if (event.$value === null) {
            return $q.reject(errNoEvent);
          }

          return event;
        });

        var taskPromise = eventPromise.then(function(event) {
          if (!event.tasks || !event.tasks[taskId]) {
            return $q.reject(errNoTask);
          }
          return event.tasks[taskId];
        });

        return $q.all({
          currentUser: spfAuthData.user(),
          event: eventPromise,
          taskId: taskId,
          task: taskPromise
        }).then(function(data) {
          if (
            !data.currentUser.publicId ||
            !data.event.owner ||
            !data.event.owner.publicId ||
            data.event.owner.publicId !== data.currentUser.publicId
          ) {
            return $q.reject(errNotAuthaurized);
          } else {
            return data;
          }
        });
      };
    }
  ]).

  /**
   * EditEventTaskCtrl
   *
   */
  controller('EditEventTaskCtrl', [
    'initialData',
    'spfAlert',
    'urlFor',
    'spfNavBarService',
    'clmDataStore',
    function EditEventTaskCtrl(initialData, spfAlert, urlFor, spfNavBarService, clmDataStore) {
      var self = this;

      this.event = initialData.event;
      this.taskId = initialData.taskId;
      this.task = initialData.task;
      this.savingTask = false;

      spfNavBarService.update(
        this.task.title, [{
          title: 'Events',
          url: '#' + urlFor('events')
        }, {
          title: this.event.title,
          url: '#' + urlFor('oneEvent', {eventId: this.event.$id})
        }, {
          title: 'Challenges',
          url: '#' + urlFor('editEvent', {eventId: this.event.$id})
        }]
      );

      this.saveTask = function(event, taskId, task) {
        self.savingTask = true;
        clmDataStore.events.updateTask(event.$id, taskId, task).then(function() {
          spfAlert.success('Task saved');
        }).catch(function(err) {
          spfAlert.error(err);
        }).finally(function() {
          self.savingTask = false;
        });
      };
    }
  ])

  ;

})();
