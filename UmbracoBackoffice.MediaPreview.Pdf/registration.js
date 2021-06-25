angular.module('umbraco').run(['mediaPreview', function (mediaPreview) {
    mediaPreview.registerPreview(['pdf'], "/App_Plugins/UmbracoBackoffice.MediaPreview.Pdf/umbextmediapreviewpdf.html");
}]);
