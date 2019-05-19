import EVMRevert from './helpers/EVMRevert'
import time from './helpers/time'

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const TestToken = artifacts.require('TestToken');
const TokenTimelock = artifacts.require('TokenTimelock');

contract('TokenTimelock', function ([_, owner, beneficiary]) {
  const amount = new BigNumber(100);
  const amountPerRelease = new BigNumber(33);

  context('with token', function () {
    beforeEach(async function () {
      this.token = await TestToken.new();
    });

    it('rejects any release times in the past', async function () {
      const pastReleaseTime = (await time.latest()) - time.duration.years(1);
      const futureReleaseTime = (await time.latest()) + time.duration.years(1);
      await TokenTimelock.new(this.token.address, beneficiary, owner, [pastReleaseTime.toString(), futureReleaseTime.toString()]).should.be.rejectedWith(EVMRevert)
    });

    context('once deployed', function () {
      beforeEach(async function () {
        this.releaseTimeOne = (await time.latest()) + time.duration.years(1);
        this.releaseTimeTwo = (await time.latest()) + time.duration.years(2);
        this.releaseTimeThree = (await time.latest()) + time.duration.years(3);
        this.timelock = await TokenTimelock.new(this.token.address, beneficiary, owner, [this.releaseTimeOne, this.releaseTimeTwo, this.releaseTimeThree]);
        await this.token.setBalance(this.timelock.address, amount);
      });

      it('can get state', async function () {
        (await this.timelock.token()).should.be.equal(this.token.address);
        (await this.timelock.beneficiary()).should.be.equal(beneficiary);
        (await this.timelock.releaseTime(0)).should.be.bignumber.equal(this.releaseTimeOne);
        (await this.timelock.releaseTime(1)).should.be.bignumber.equal(this.releaseTimeTwo);
        (await this.timelock.releaseTime(2)).should.be.bignumber.equal(this.releaseTimeThree);
      });

      it('cannot be released before first limit', async function () {
        await this.timelock.release().should.be.rejectedWith(EVMRevert)
      });

      it('cannot be released just before first limit', async function () {
        await time.increaseTo(this.releaseTimeOne - time.duration.seconds(3));
        await this.timelock.release().should.be.rejectedWith(EVMRevert)
      });

      it('can release just after first limit', async function () {
        await time.increaseTo(this.releaseTimeOne + time.duration.seconds(1));
        await this.timelock.release();
        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amountPerRelease);
      });

      it('can release after first time limit', async function () {
        await time.increaseTo(this.releaseTimeOne + time.duration.years(1));
        await this.timelock.release();
        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amountPerRelease);
      });

      it('can release multiple time limits', async function () {
        await time.increaseTo(this.releaseTimeOne + time.duration.years(1));
        await this.timelock.release();
        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amountPerRelease);

        await time.increaseTo(this.releaseTimeTwo + time.duration.years(1));
        await this.timelock.release();
        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amountPerRelease * 2);

        await time.increaseTo(this.releaseTimeThree + time.duration.years(1));
        await this.timelock.release();
        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amount);
      });

      it('cannot release same limit for than once', async function () {
        await time.increaseTo(this.releaseTimeOne + time.duration.seconds(1));
        await this.timelock.release();
        await this.timelock.release().should.be.rejectedWith(EVMRevert);

        await time.increaseTo(this.releaseTimeTwo + time.duration.seconds(1));
        await this.timelock.release();
        await this.timelock.release().should.be.rejectedWith(EVMRevert);

        await time.increaseTo(this.releaseTimeThree + time.duration.seconds(1));
        await this.timelock.release();
        await this.timelock.release().should.be.rejectedWith(EVMRevert);

        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amount);
      });

      it('only owner can claim tokens', async function () {
        await this.timelock.claim({ from: owner });
        await this.timelock.claim({ from: beneficiary }).should.be.rejectedWith(EVMRevert);
        (await this.token.balanceOf(owner)).should.be.bignumber.equal(amount);
      })
    });
  });
});
