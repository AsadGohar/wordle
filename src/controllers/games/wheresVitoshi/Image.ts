class WheresVitoshiImg {
  private vitoshiCoordsSet: number[][];

  constructor() {
    this.vitoshiCoordsSet = [
      [4552, 2425],
      [6426, 319],
      [1353, 859],
      [587, 2993],
      [3484, 2936],
      [5334, 1867],
      [6134, 1885],
      [5374, 2599],
      [7226, 4240],
      [3915, 4318],
      [4141, 3612],
    ];
  }

  private getRandomInt(min: number, max: number) {
    //random num generator (inclusive)
    var num = Math.floor(Math.random() * (max - min + 1)) + min;
    return num;
  }

  getRandomImg() {
    return this.getRandomInt(1, this.vitoshiCoordsSet.length);
    // return 1;
  }

  getImgCoords(imgNum: number) {
    return this.vitoshiCoordsSet[imgNum - 1];
  }
}

export const Img = new WheresVitoshiImg();
