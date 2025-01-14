<?php

namespace App\Entity\Framework;

use Doctrine\ORM\Mapping as ORM;
use JMS\Serializer\Annotation as Serializer;

/**
 * Class CfRubricCriterionLevel
 *
 * @ORM\MappedSuperclass()
 *
 * @ORM\Table(name="rubric_criterion_level")
 * @ORM\Entity(repositoryClass="App\Repository\Framework\CfRubricCriterionLevelRepository")
 *
 * @Serializer\VirtualProperty(
 *     "rubricCriterionId",
 *     exp="object.getCriterion()?object.getCriterion().getIdentifier():null",
 *     options={
 *         @Serializer\SerializedName("rubricCriterionId"),
 *         @Serializer\Expose()
 *     }
 * )
 */
class CfRubricCriterionLevel extends AbstractLsBase implements CaseApiInterface
{
    /**
     * @var string
     *
     * @ORM\Column(name="description", type="text", length=65535, nullable=true)
     *
     * @Serializer\Expose()
     */
    private $description;

    /**
     * @var string
     *
     * @ORM\Column(name="quality", type="text", length=65535, nullable=true)
     *
     * @Serializer\Expose()
     */
    private $quality;

    /**
     * @var float
     *
     * @ORM\Column(name="score", type="float", nullable=true)
     *
     * @Serializer\Expose()
     */
    private $score;

    /**
     * @var string
     *
     * @ORM\Column(name="feedback", type="text", length=65535, nullable=true)
     *
     * @Serializer\Expose()
     */
    private $feedback;

    /**
     * @var int
     *
     * @ORM\Column(name="position", type="integer", nullable=true)
     *
     * @Serializer\Expose()
     */
    private $position;

    /**
     * @var CfRubricCriterion
     *
     * @ORM\ManyToOne(targetEntity="CfRubricCriterion", inversedBy="levels")
     * @ORM\JoinColumn(name="criterion_id", referencedColumnName="id", nullable=false)
     *
     * @Serializer\Exclude()
     */
    private $criterion;

    /**
     * @return string
     */
    public function getDescription(): string
    {
        return $this->description;
    }

    /**
     * @param string $description
     *
     * @return CfRubricCriterionLevel
     */
    public function setDescription($description): CfRubricCriterionLevel
    {
        $this->description = $description;

        return $this;
    }

    /**
     * @return string
     */
    public function getQuality(): string
    {
        return $this->quality;
    }

    /**
     * @param string $quality
     *
     * @return CfRubricCriterionLevel
     */
    public function setQuality($quality): CfRubricCriterionLevel
    {
        $this->quality = $quality;

        return $this;
    }

    /**
     * @return float
     */
    public function getScore(): float
    {
        return $this->score;
    }

    /**
     * @param float $score
     *
     * @return CfRubricCriterionLevel
     */
    public function setScore($score): CfRubricCriterionLevel
    {
        $this->score = $score;

        return $this;
    }

    /**
     * @return string
     */
    public function getFeedback(): string
    {
        return $this->feedback;
    }

    /**
     * @param string $feedback
     *
     * @return CfRubricCriterionLevel
     */
    public function setFeedback($feedback): CfRubricCriterionLevel
    {
        $this->feedback = $feedback;

        return $this;
    }

    /**
     * @return int
     */
    public function getPosition(): int
    {
        return $this->position;
    }

    /**
     * @param int $position
     *
     * @return CfRubricCriterionLevel
     */
    public function setPosition($position): CfRubricCriterionLevel
    {
        $this->position = $position;

        return $this;
    }

    /**
     * @return CfRubricCriterion
     */
    public function getCriterion(): CfRubricCriterion
    {
        return $this->criterion;
    }

    /**
     * @param CfRubricCriterion $criterion
     *
     * @return CfRubricCriterionLevel
     */
    public function setCriterion(CfRubricCriterion $criterion): CfRubricCriterionLevel
    {
        $this->criterion = $criterion;

        return $this;
    }
}
