const globalshare={
    assignConst: function (source) {
        for (let [key, value] of Object.entries(source)) {
  
          Object.defineProperty(this, key, {
            value,
            writable: false
          });
  
        }
        return this;
    }
};

export default globalshare;