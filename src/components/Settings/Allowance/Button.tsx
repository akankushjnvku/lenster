import { gql, useLazyQuery } from '@apollo/client'
import { Button } from '@components/UI/Button'
import { Spinner } from '@components/UI/Spinner'
import { ApprovedAllowanceAmount } from '@generated/types'
import { MinusIcon, PlusIcon } from '@heroicons/react/outline'
import { getModule } from '@lib/getModule'
import trackEvent from '@lib/trackEvent'
import React, { Dispatch, FC } from 'react'
import toast from 'react-hot-toast'
import { useSendTransaction, useWaitForTransaction } from 'wagmi'

const GENERATE_ALLOWANCE_QUERY = gql`
  query GenerateModuleCurrencyApprovalData(
    $request: GenerateModuleCurrencyApprovalDataRequest!
  ) {
    generateModuleCurrencyApprovalData(request: $request) {
      to
      from
      data
    }
  }
`

interface Props {
  title?: string
  module: ApprovedAllowanceAmount
  allowed: boolean
  setAllowed: Dispatch<boolean>
}

const AllowanceButton: FC<Props> = ({
  title = 'Allow',
  module,
  allowed,
  setAllowed
}) => {
  const [generateAllowanceQuery, { loading: queryLoading }] = useLazyQuery(
    GENERATE_ALLOWANCE_QUERY
  )

  const {
    data: txData,
    isLoading: transactionLoading,
    sendTransactionAsync
  } = useSendTransaction({
    onError(error) {
      toast.error(error?.message)
    }
  })
  const { isLoading: waitLoading } = useWaitForTransaction({
    wait: txData?.wait,
    onError(error) {
      toast.error(error?.message)
    }
  })

  const handleAllowance = (
    currencies: string,
    value: string,
    selectedModule: string
  ) => {
    generateAllowanceQuery({
      variables: {
        request: {
          currency: currencies,
          value: value,
          [getModule(module.module).type]: selectedModule
        }
      }
    }).then((res) => {
      const data = res?.data?.generateModuleCurrencyApprovalData
      sendTransactionAsync({
        request: { from: data.from, to: data.to, data: data.data }
      }).then(() => {
        toast.success(
          `Module ${value === '0' ? 'disabled' : 'enabled'} successfully!`
        )
        trackEvent(`${value === '0' ? 'disabled' : 'enabled'} module allowance`)
      })
    })
  }

  return (
    <>
      {allowed ? (
        <Button
          variant="success"
          className="!space-x-0"
          icon={
            queryLoading || transactionLoading || waitLoading ? (
              <Spinner variant="success" size="xs" />
            ) : (
              <PlusIcon className="w-4 h-4" />
            )
          }
          onClick={() =>
            handleAllowance(module.currency, '10000000000', module.module)
          }
        >
          <span className="hidden ml-1.5 md:inline-block">{title}</span>
        </Button>
      ) : (
        <Button
          variant="warning"
          className="!space-x-0"
          icon={
            queryLoading || transactionLoading || waitLoading ? (
              <Spinner variant="warning" size="xs" />
            ) : (
              <MinusIcon className="w-4 h-4" />
            )
          }
          onClick={() => handleAllowance(module.currency, '0', module.module)}
        >
          <span className="hidden ml-1.5 md:inline-block">Revoke</span>
        </Button>
      )}
    </>
  )
}

export default AllowanceButton
