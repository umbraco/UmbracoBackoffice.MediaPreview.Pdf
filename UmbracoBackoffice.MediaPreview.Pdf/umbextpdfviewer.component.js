/**
@ngdoc directive
@name umbracoBackoffice.directives.directive:umbPdfViewer
@restrict E
@scope

@description
Use this component to render an Umbraco PDF viewer. The PDF viewer will load the provided PDF and you can navigate the content.

<h3>Markup example</h3>
<pre>
    <div>
        <umbext-pdf-viewer src="path/to/file.pdf"></umb-pdf-viewer>
    </div>
</pre>

@param {string} src Url/Path to the PDF
**/

(function () {
  'use strict';

  angular
    .module('umbraco.directives')
    .component('umbextPdfViewer', {
      templateUrl: '/App_Plugins/UmbracoBackoffice.MediaPreview.Pdf/umbext-pdf-viewer.html',
      controller: UmbPDFViewerController,
      controllerAs: 'vm',
      bindings: {
        src: "<"
      }
    });

  UmbPDFViewerController.$inject = ['$scope', '$element', 'assetsService', 'windowResizeListener', 'umbRequestHelper'];

  function UmbPDFViewerController($scope, $element, assetsService, windowResizeListener, umbRequestHelper) {

    const vm = this;
    const element = $element[0];
    const pdfViewerElement = element.querySelector('.umbext-pdf-viewer');
    const canvas = element.querySelector('.umbext-pdf-viewer--pdf-canvas');
    var currentPage = null;
    var pageLoading = false;
    var pageRendering = false;
    var initialLoad = true;

    vm.pdf = null;
    vm.pageNumber = 1;
    vm.totalPages = 0;
    vm.pageNumberPending = null;

    vm.$onInit = onInit;
    vm.nextPage = nextPage;
    vm.prevPage = prevPage;
    vm.updatePage = updatePage;
    vm.handleInputKeypress = handleInputKeypress;

    function onInit() {

      $scope.$emit("mediaPreviewLoadingStart");

      assetsService.load([umbRequestHelper.convertVirtualToAbsolutePath("~/App_Plugins/UmbracoBackoffice.MediaPreview.Pdf/pdf.min.js")], $scope)
        .then(function () {
          pdfjsLib.GlobalWorkerOptions.workerSrc = umbRequestHelper.convertVirtualToAbsolutePath("~/App_Plugins/UmbracoBackoffice.MediaPreview.Pdf/pdf.worker.min.js");
          loadDocument();
        });

      windowResizeListener.register(onResize);
      canvas.addEventListener("keydown", handleKeydown);
    }

    function nextPage () {
      if (vm.pageNumber >= vm.totalPages) {
        return;
      }

      vm.pageNumber = vm.pageNumber + 1;
      queuePage(vm.pageNumber);
    }

    function prevPage() {
      if (vm.pageNumber <= 1) {
        return;
      }

      vm.pageNumber = vm.pageNumber - 1;
      queuePage(vm.pageNumber);
    }

    function updatePage () {

      vm.pageNumber = Math.min(Math.max(vm.pageNumber, 1), vm.totalPages);

      queuePage(vm.pageNumber);
    }

    function queuePage (pageNumber) {
      if (pageLoading || pageRendering) {
        vm.pageNumberPending = pageNumber;
      } else {
        loadPage(pageNumber);
      }
    }

    function loadPage(pageNumber) {
      pageLoading = true;

      vm.pdf.getPage(pageNumber).then(function(page) {
        pageLoading = false;
        currentPage = page;

        if(initialLoad === true) {
            $scope.$emit("mediaPreviewLoadingComplete");
            initialLoad = false;
        }

        render();
      });
    }

    function loadDocument () {
      try {
        const loadingTask = pdfjsLib.getDocument({url: vm.src });

        loadingTask.promise.then((pdf) => {
          vm.pdf = pdf;
          vm.totalPages = pdf.numPages;
          loadPage(vm.pageNumber);
          $scope.$applyAsync();
        });
      } catch (e) {
        console.error('error', e);
      }
    }

    function onResize() {
        if(currentPage && pageRendering === false) {
            render();
        }
    }

    function render() {
        pageRendering = true;

        const viewport = currentPage.getViewport({ scale: 1 });
        const maxWidth = element.parentElement.clientWidth;
        const maxHeight = document.documentElement.clientHeight - 172;

        const pdfAspect = viewport.width / viewport.height;
        const maxAspect = maxWidth / maxHeight;

        const desiredWidth = Math.min(maxWidth, maxWidth*(pdfAspect / maxAspect));

        const scale = desiredWidth / viewport.width;
        const scaledViewport = currentPage.getViewport({ scale });

        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        };

        const renderTask = currentPage.render(renderContext);

        renderTask.promise.then(function() {
          pageRendering = false;

          if (vm.pageNumberPending !== null) {
            loadPage(vm.pageNumberPending);
            vm.pageNumberPending = null;
          }
        });
    }

    function handleKeydown (event) {
      switch (event.keyCode) {
        // arrow left
        case 37:
          event.stopPropagation();
          event.preventDefault();
          prevPage();
          break;

        // arrow right
        case 39:
          event.stopPropagation();
          event.preventDefault();
          nextPage();
          break;

        default:
          break;
      }

      $scope.$applyAsync();
    }

    function handleInputKeypress (event) {
      switch (event.keyCode) {
        case 13:
          event.stopPropagation();
          event.preventDefault();
          updatePage();
          break;
        default:
          break;
      }
    }

    //ensure to unregister from all events and kill jquery plugins
    $scope.$on('$destroy', function () {
      windowResizeListener.unregister(onResize);
      canvas.removeEventListener("keydown", handleKeydown);
    });
  }

})();
