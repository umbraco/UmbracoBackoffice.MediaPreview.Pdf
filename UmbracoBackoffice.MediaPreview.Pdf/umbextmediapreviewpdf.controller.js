angular.module("umbraco")
.controller("umbextMediapreviewPdfController",
    function () {

        var vm = this;

        vm.getClientSideUrl = function(source) {
            return URL.createObjectURL(source);
        }

    });
