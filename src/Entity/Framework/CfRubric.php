<?php

namespace App\Entity\Framework;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use JMS\Serializer\Annotation as Serializer;

/**
 * @ORM\MappedSuperclass()
 *
 * @ORM\Table(name="rubric")
 * @ORM\Entity(repositoryClass="App\Repository\Framework\CfRubricRepository")
 */
class CfRubric extends AbstractLsBase implements CaseApiInterface
{
    /**
     * @var string
     *
     * @ORM\Column(name="title", type="text", length=65535, nullable=true)
     *
     * @Serializer\Expose()
     */
    private $title;

    /**
     * @var string
     *
     * @ORM\Column(name="description", type="text", length=65535, nullable=true)
     *
     * @Serializer\Expose()
     */
    private $description;

    /**
     * @var Collection|CfRubricCriterion[]
     *
     * @ORM\OneToMany(targetEntity="CfRubricCriterion", mappedBy="rubric", orphanRemoval=true, cascade={"persist", "remove"})
     *
     * @Serializer\Expose()
     * @Serializer\SerializedName("CFRubricCriteria"),
     * @Serializer\Type("array<App\Entity\Framework\CfRubricCriterion>"),
     */
    private $criteria;

    public function __construct($identifier = null)
    {
        parent::__construct($identifier);
        $this->criteria = new ArrayCollection();
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): CfRubric
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function setDescription(string $description): CfRubric
    {
        $this->description = $description;

        return $this;
    }

    /**
     * @return CfRubricCriterion[]|Collection
     */
    public function getCriteria()
    {
        return $this->criteria;
    }

    /**
     * @param CfRubricCriterion[]|Collection|null $criteria
     */
    public function setCriteria(?iterable $criteria): CfRubric
    {
        $this->criteria = new ArrayCollection();

        if (null === $criteria) {
            return $this;
        }

        foreach ($criteria as $criterion) {
            $this->addCriterion($criterion);
        }

        return $this;
    }

    public function addCriterion(CfRubricCriterion $criterion): CfRubric
    {
        $this->criteria[] = $criterion;

        return $this;
    }
}
