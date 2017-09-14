const UpdateManager = {
    targets: new Set(),
    interval: setInterval(() => UpdateManager.update(), 60000),
    /**
     * @param {module:data-store-holder} sh - DataStoreHolder to get automatic updates.
     * @returns {undefined}
     */
    register(sh) {
        this.targets.add(sh);
    },
    async update() {
        for(const target of this.targets.values()) {
            try {
                await target.update();
            }
            catch(e) {
                console.error('Updating a data store resulted in an error:', e);
            }
        }
    }
};
module.exports = UpdateManager;
