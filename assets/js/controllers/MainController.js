(function() {
	"use strict";
	angular
	.module("app")
	.controller("MainController", MainController);

	MainController.$inject = ["$rootScope", "$scope", "$interval", "$localStorage"];

	function MainController($rootScope, $scope, $interval, $localStorage) {

		$scope.$storage = $localStorage;

	}

})();