const globalshare={
    assignConst: function (source) {
        for (let [key, value] of Object.entries(source)) {
  
          Object.defineProperty(this, key, {
            value,
            writable: false
          });
  
        }
    }
};

export default globalshare;