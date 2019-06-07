import EVMRevert from './helpers/EVMRevert'
import time from './helpers/time'

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const TestToken = artifacts.require('TestToken');
const RelockableTokenTimelock = artifacts.require('RelockableTokenTimelock');

contract('RelockableTokenTimelock', function ([_, owner, nonOwner, beneficiary]) {
  const amount = new BigNumber(100);

  context('with token', function () {
    beforeEach(async function () {
      this.token = await TestToken.new();
    });

    it('rejects any lock duration less than one', async function () {
      await RelockableTokenTimelock.new(this.token.address, owner, beneficiary, 0).should.be.rejectedWith(EVMRevert)
    });

    context('once deployed', function () {
      beforeEach(async function () {
        this.lockDuration = time.duration.years(1);
        this.releaseTime = (await time.latest()) + this.lockDuration
        this.timelock = await RelockableTokenTimelock.new(this.token.address, owner, beneficiary, this.lockDuration);
        await this.token.setBalance(this.timelock.address, amount);
      });

      it('can get state', async function () {
        (await this.timelock.token()).should.be.equal(this.token.address);
        (await this.timelock.beneficiary()).should.be.equal(beneficiary);
        (await this.timelock.lockDuration()).should.be.bignumber.equal(this.lockDuration);
        (await this.timelock.releaseTime()).should.be.bignumber.equal(this.releaseTime);
      });

      it('cannot be released before limit', async function () {
        await this.timelock.release({ from: owner }).should.be.rejectedWith(EVMRevert)
      });

      it('cannot be released just before limit', async function () {
        await time.increaseTo(this.releaseTime - time.duration.seconds(3));
        await this.timelock.release({ from: owner }).should.be.rejectedWith(EVMRevert)
      });

      it('only owner can release just after limit', async function () {
        await time.increaseTo(this.releaseTime + time.duration.seconds(1));
        await this.timelock.release({ from: nonOwner }).should.be.rejectedWith(EVMRevert);
        await this.timelock.release({ from: owner });
        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amount);
      });

      it('only owner can chose to lock again after limit', async function () {
        // Cannot lock again if previous lock is still not past
        await this.timelock.lock({ from: owner }).should.be.rejectedWith(EVMRevert);

        await time.increaseTo(this.releaseTime);
        await this.timelock.lock({ from: nonOwner }).should.be.rejectedWith(EVMRevert);
        await this.timelock.lock({ from: owner });

        // Should be locked for another lock duration
        (await this.timelock.releaseTime()).should.be.bignumber.equal(this.releaseTime + this.lockDuration);

        // Cannot release since its locked
        await this.timelock.release({ from: owner }).should.be.rejectedWith(EVMRevert);

        // Can release after re-lock
        await time.increaseTo(this.releaseTime + this.lockDuration + time.duration.seconds(1));
        await this.timelock.release({ from: owner });
        (await this.token.balanceOf(beneficiary)).should.be.bignumber.equal(amount);
      })
    });
  });
});
