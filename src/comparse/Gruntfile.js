module.exports = function(grunt){
    grunt.initConfig({
        nodeunit: {
            all: ['test/*.js']
        }
    });
    
    //load plugins
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    
    // setup tasks
    grunt.registerTask('default', ['nodeunit']);
};