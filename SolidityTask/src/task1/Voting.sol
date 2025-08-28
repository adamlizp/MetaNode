// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/*
创建一个名为Voting的合约，包含以下功能：
一个mapping来存储候选人的得票数
一个vote函数，允许用户投票给某个候选人
一个getVotes函数，返回某个候选人的得票数
一个resetVotes函数，重置所有候选人的得票数
*/
contract Voting {

    struct CandidateVote {
        uint256 votes;
        uint256 version;
    }

    // private 防止外部修改version，只允许resetVotes方法修改，然后重置之后获取就是版本判断重置的得票数
    mapping(address => CandidateVote) private votes;
    //采用version 版本 实现
    uint256 private currentVersion;

    function vote (address _candidate) public {
        // 这里在投票的时候需要考虑版本过期，需要重置候选人的票数
        if (votes[_candidate].version < currentVersion) {
            votes[_candidate].votes = 0;
        }
        
        votes[_candidate].votes++;
        votes[_candidate].version = currentVersion;
        
    }

    function getVotes(address _candidate) public view returns (uint256) {
        if (votes[_candidate].version < currentVersion) {
            return 0;
        }
        return votes[_candidate].votes;
    }

    // 增加版本，老版本的得票数清零
    function resetVotes() public {
        currentVersion++;
    }

    
} 


