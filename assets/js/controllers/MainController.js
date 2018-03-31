(function() {
	"use strict";
	angular
	.module("app")
	.controller("MainController", MainController);

	MainController.$inject = ["$scope", "$localStorage", "$q", "$timeout"];

	function MainController($scope, $localStorage, $q, $timeout) {


		const excel = require('node-excel-export');

		$scope.ajaxLoading = false;
		$scope.$storage = $localStorage;

		$scope.openExternal = function(url){
			shell.openExternal(url);
        };
        $scope.results = {
	        ajaxLoading: false,
            state: 0,
	        files: [],
	        filepath: "",
	        checkFile: function(path){
	            var parts = path.split(".");
	            return parts.length > 1 && parts[parts.length - 1] === "txt";
	        },
	        reset: function(){
            	this.state = 0;
            	this.filepath = "";
	        },
	        analyzeFolder: function(){
            	const parent = this;
		        parent.ajaxLoading = true;
		        fs.readdir($scope.$storage.env.directory, function(err, files) {
			        parent.ajaxLoading = false;
			        // es6
			        if(err){
				        console.warn(err);
				        alert("Αποτυχία ανάγνωσης φακέλου.");
				        $scope.$apply();
				        return;
			        }
			        for(let filePath of files) {
			        	if(parent.checkFile(filePath) === true){
					        parent.files.push(filePath);
				        }
			        }
			        parent.state = 1;
			        $scope.$apply();
		        });
	        },
	        clearFolder: function(){
		        this.reset();
		        this.files = [];
		        $scope.$storage.env.directory = '';
	        },
	        openFile: function(){
            	if(!this.filepath){
            		return;
	            }
		        shell.openItem(this.filepath);
	        },
            generateFile: function(){
	            const parent = this;
	            parent.ajaxLoading = true;
	            const options = {
		            title: "report.xlsx",
		            defaultPath: "report.xlsx",
	            };
	            let filename = dialog.showSaveDialog(options);
	            if(!filename){
		            parent.ajaxLoading = false;
		            return;
	            }
	            parent.createExcelFile()
	            .then(function(report){
		            fs.writeFile(filename, report, (err) => {
			            if (err) {
				            console.warn(err);
				            $scope.$apply();
				            alert("Αποτυχία δημιουργίας αρχείου.");
				            return;
			            }
			            parent.filepath = filename;
			            parent.state = 2;
			            $scope.$apply();
		            });
	            }).catch(function(err){
	            	console.warn(err);
	            }).then(function(){
		            parent.ajaxLoading = false;
	            });
            },
	        createExcelFile: function(){
		        var defer = $q.defer();
	        	const parent = this;
	        	let files = angular.copy(this.files);
	        	let directory = angular.copy($scope.$storage.env.directory);
	        	let promises = [];
	        	for(let i = 0; i < files.length; i++){
			        promises.push(this.getFileContents(path.join(directory, files[i])));
		        }
	        	$q.all(promises).then(function(results){
			        let products = [];
			        for(let i = 0; i < results.length; i++){
				        if(!results[i]){
				        	continue;
				        }
				        let result = results[i];
				        let lineProducts = [];
				        for(var z = 0; z < result.products.length; z++){
				        	let product = result.products[z];
				        	product.details = {
						        date: result.date,
						        number: result.number,
						        sum: result.sum,
						        quantity: result.quantity,
					        };
					        lineProducts.push(product);
				        }
				        products = products.concat(lineProducts);
			        }
			        defer.resolve(parent.processResults(products));
		        }).catch(function(err){
		        	defer.reject(err);
		        });
		        return defer.promise;
	        },
	        fixEncoding: function(buffer){
		        let charset = jschardet.detect(buffer);
		        let resultBuffer = buffer;
		        if(charset.encoding !== "UTF-8"){
			        resultBuffer = encoding.convert(buffer, "UTF-8", "ISO-8859-7");
		        }
		        return resultBuffer.toString();
	        },
	        getFileContents: function(path){
	        	let parent = this;
		        var defer = $q.defer();
		        if(!fs.existsSync(path)){
			        defer.resolve(false);
		        }
		        fs.readFile(path, (err, data) => {
			        if (err){
				        console.warn(err);
				        return defer.resolve(false);
			        }
			        let results = {
				        date: "",
				        number: "",
				        sum: 0,
				        quantity: 0,
				        products: []
			        };
			        let resultBuffer = parent.fixEncoding(data);
			        let lines = resultBuffer.split("\r\n");
			        lines.splice(0, 9);
			        lines.map(function(txt, index){
				        // var line = txt.trim();
				        var line = txt.trim();
				        if(txt === ""){
					        return;
				        }
				        let sum = /^Σ Y N O Λ O:\s*EYPΩ\s?([0-9,]*)/.exec(line);
				        if(sum && sum[1]){
					        results.sum = sum[1];
					        return;
				        }
				        let quantity = /^ΠOΣOTHTA\s*([0-9]*)/.exec(line);
				        if(quantity && quantity[1]){
					        results.quantity = parseInt(quantity[1]);
					        return;
				        }
				        let number = /^AP\.ΔEΛT\.\s*([0-9\/]*)$/.exec(line);
				        if(number && number[1]){
					        results.number = number[1];
					        let dateLine = lines[index + 1];
					        if(dateLine){
						        let date = /\w*\s*([0-9\-]{10}).*:([0-9]{2}:[0-9]{2})$/.exec(dateLine);
						        if(date && date[1]){
							        results.date = date[1] + " " + date[2];
						        }
					        }
					        return;
				        }
				        let perispomeni = /~/.exec(line);
				        if(perispomeni && perispomeni[1]){
					        return;
				        }

				        let metrita = /^MΕ?TPHTA\s*([0-9,]*)$/.exec(line);
				        if(metrita && metrita[1]){
					        return;
				        }
				        let mitroo = /^APIΘMOΣ MHTPΩOY.*/.exec(line);
				        if(mitroo && mitroo[1]){
					        return;
				        }
				        let product = /(.*)\s*([- ][0-9]+,[0-9]{2})\s*([0-9]{2},[0-9]{2})%$/.exec(line);
				        if(product && product[1]){
					        let p = {};
					        let previousLine = lines[index - 1];
					        if(previousLine){
						        let correct = /^ΔIOPΘΩΣH/.exec(previousLine.trim());
						        if(correct && correct[0]){
							        p.correction = true;
						        }
					        }
					        p.name = product[1].trim();
					        p.price = product[2].trim();
					        p.vat = product[3].trim();
					        results.products.push(p);
					        return;
				        }
			        });
			        return defer.resolve(results);
		        });
		        return defer.promise;
	        },
	        processResults: function(products){
	        	let dataset = [];
				products.map(function(product, index){
					let details = "Σύνολο απόδειξης: " + product.details.sum + " ("+product.details.quantity+" προϊόντα)";
					dataset.push({
						aa: index + 1,
						name: product.name,
						price: product.price.replace(",", "."),
						vat: product.vat.replace(",", "."),
						date: product.details.date,
						number: product.details.number,
						details: details,
					});
				});
		        // You can define styles as json object
		        // More info: https://github.com/protobi/js-xlsx#cell-styles
		        const styles = {
			        heading: {
				        font: {
					        color: {
						        rgb: '000000'
					        },
					        sz: 16,
					        bold: true,
					        underline: false
				        },
				        alignment: {
				        	horizontal: "center"
				        }
			        },
			        headers: {
				        font: {
					        color: {
						        rgb: '000000'
					        },
					        sz: 14,
					        bold: true,
					        underline: false
				        }
			        },
			        cell: {
				        default:{
					        font: {
						        color: {
							        rgb: '000000'
						        },
						        sz: 12,
						        bold: false,
						        underline: false
					        }
				        },
				        float: {
					        font: {
						        color: {
							        rgb: '000000'
						        },
						        sz: 12,
						        bold: false,
						        underline: false
					        },
					        numFmt: "0.00"
				        },
				        percentage: {
					        font: {
						        color: {
							        rgb: '000000'
						        },
						        sz: 12,
						        bold: false,
						        underline: false
					        },
					        numFmt: "0.00%"
				        }
			        }
		        };

		        //Array of objects representing heading rows (very top)
		        const heading = [
			        [
			        	{value: 'Αποδείξεις', style: styles.heading}
			        ]
		        ];

		        //Here you specify the export structure
		        const specification = {
			        aa: { // <- the key should match the actual data key
				        displayName: 'Α/Α', // <- Here you specify the column header
				        headerStyle: styles.headers,
				        cellStyle: styles.cell.default, // <- Cell style
				        width: '5' // <- width in pixels
			        },
			        name: {
				        displayName: 'Όνομα προϊόντος',
				        headerStyle: styles.headers,
				        cellStyle: styles.cell.default, // <- Cell style
				        width: '34' // <- width in chars (when the number is passed as string)
			        },
			        price: {
				        displayName: 'Τιμή',
				        headerStyle: styles.headers,
				        cellStyle: styles.cell.float, // <- Cell style
				        width: '10' // <- width in pixels
			        },
			        vat: {
				        displayName: 'Φ.Π.Α',
				        headerStyle: styles.headers,
				        cellStyle: styles.cell.percentage, // <- Cell style
				        width: '8' // <- width in pixels
			        },
			        date: {
				        displayName: 'Ημερομηνία',
				        headerStyle: styles.headers,
				        cellStyle: styles.cell.default, // <- Cell style
				        width: '16' // <- width in pixels
			        },
			        number: {
				        displayName: 'Αριθμός απόδειξης',
				        headerStyle: styles.headers,
				        cellStyle: styles.cell.default, // <- Cell style
				        width: '20' // <- width in pixels
			        },
			        details: {
				        displayName: 'Λεπτομέρειες',
				        headerStyle: styles.headers,
				        cellStyle: styles.cell.default, // <- Cell style
				        width: '34' // <- width in pixels
			        }
		        };
		        // Define an array of merges. 1-1 = A:1
		        // The merges are independent of the data.
		        // A merge will overwrite all data _not_ in the top-left cell.
		        const merges = [
			        { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
		        ];

		        // Create the excel report.
		        // This function will return Buffer
		        return excel.buildExport(
			        [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
				        {
					        name: 'Δεδομένα', // <- Specify sheet name (optional)
					        heading: heading, // <- Raw heading array (optional)
					        merges: merges, // <- Merge cell ranges
					        specification: specification, // <- Report specification
					        data: dataset // <-- Report data
				        }
			        ]
		        );
	        }
        };
		$scope.$watch("$storage.env.directory", function(dir){
			$scope.results.state = 0;
		});
	}

})();