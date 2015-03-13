
/*
 * Define the main Huna JS module
 */
var app = angular.module('HunaJS', ['ngRoute'])

/**
 * Get some routes in place
 */
.config(function($routeProvider, $locationProvider) {
 
  // Root
  $routeProvider
  	.when('/', {
	  controller: 'MainController',
	  templateUrl: '/js/app/modules/main/main.html'
	})

  // User Routes
	.when('/user/register', {
		controller: 'RegisterController',
		templateUrl: '/js/app/modules/user/register.html'
	})
  .when('/user/register/activate', {
    controller: 'ActivateController',
    templateUrl: '/js/app/modules/user/activate.html'
  })
  .when('/user/login', {
    controller: 'LoginController',
    templateUrl: '/js/app/modules/user/login.html'
  })
  .when('/user/password', {
    controller: 'ResetPasswordController',
    templateUrl: '/js/app/modules/user/resetpassword.html'
  })

  // Dashboards
  .when('/dashboard', {
    controller: 'DashboardController',
    templateUrl: '/js/app/modules/dashboard/dashboard.html'
  });

  $locationProvider.html5Mode('true');

}); // end config