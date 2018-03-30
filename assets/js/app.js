(function() {
	"use strict";
	angular
    .module("app", ['ngStorage'])
    .run(Run)
	.directive("ngDir", NgDirDirective)
	.directive("popover", PopoverDirective);

	Run.$inject = ["$localStorage"];
	function Run($localStorage){
		$localStorage.$default({
			env: angular.copy(defaultEnv)
		});
	}

	function NgDirDirective(){
		return {
			restrict : "A",
			scope: {
				ngDir: "="
			},
			link: function(scope, elem, attr) {
				if(!elem.length) return false;

				var el = elem[0];
				el.setAttribute("webkitdirectory","");
				el.setAttribute("directory","");

				el.addEventListener("change",function(event){
					var files = event.target.files;
					if(files.length){
						scope.ngDir = files[0].path;
						scope.$apply();
					}
				},true);

				scope.$watch('ngDir', function(){
					if(scope.ngDir === '')
						el.value = "";
				});
			}
		};
	}

	PopoverDirective.$inject = ["$timeout"];
	function PopoverDirective($timeout) {
		return {
			restrict: 'A',
			transclude: false,
			link: function(scope, element) {
				if(scope.$last){
					$timeout(function(){
						jQuery(element)
						.parent()
						.find('.popover-dismiss')
						.popover({
							trigger: 'focus'
						});
					});
				}
			}
		}
	}
})();